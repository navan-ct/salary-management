CREATE EXTENSION IF NOT EXISTS "pg_trgm";

CREATE TABLE "country" (
	"code" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "country_code_format" CHECK ("country"."code" ~ '^[A-Z]{2}$')
);

CREATE TABLE "currency" (
	"code" text PRIMARY KEY NOT NULL,
	"minor_units" smallint NOT NULL,
	CONSTRAINT "currency_code_format" CHECK ("currency"."code" ~ '^[A-Z]{3}$'),
	CONSTRAINT "currency_minor_units_nonnegative" CHECK ("currency"."minor_units" >= 0)
);

CREATE TABLE "department" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "department_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	CONSTRAINT "department_name_unique" UNIQUE("name")
);

CREATE TABLE "employee" (
	"employee_id" text PRIMARY KEY NOT NULL,
	"full_name" text NOT NULL,
	"country_code" text NOT NULL,
	"department_id" integer NOT NULL,
	"annual_base_salary" numeric NOT NULL,
	"salary_currency_code" text NOT NULL,
	"salary_version" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "employee_salary_positive_finite" CHECK ("employee"."annual_base_salary" > 0 and "employee"."annual_base_salary" < 'Infinity'::numeric),
	CONSTRAINT "employee_salary_version_nonnegative" CHECK ("employee"."salary_version" >= 0)
);

CREATE TABLE "salary_change" (
	"employee_id" text NOT NULL,
	"salary_version" integer NOT NULL,
	"previous_amount" numeric NOT NULL,
	"previous_currency_code" text NOT NULL,
	"new_amount" numeric NOT NULL,
	"new_currency_code" text NOT NULL,
	"reason" text NOT NULL,
	"editor_user_id" text NOT NULL,
	"editor_name" text NOT NULL,
	"saved_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
	CONSTRAINT "salary_change_employee_id_salary_version_pk" PRIMARY KEY("employee_id","salary_version"),
	CONSTRAINT "salary_change_version_positive" CHECK ("salary_change"."salary_version" > 0),
	CONSTRAINT "salary_change_amounts_positive_finite" CHECK (
    "salary_change"."previous_amount" > 0 and "salary_change"."previous_amount" < 'Infinity'::numeric
    and "salary_change"."new_amount" > 0 and "salary_change"."new_amount" < 'Infinity'::numeric
  ),
	CONSTRAINT "salary_change_reason_nonblank" CHECK ("salary_change"."reason" ~ U&'[^[:space:]\0085\00A0\1680\2000-\200A\2028\2029\202F\205F\3000\FEFF]'),
	CONSTRAINT "salary_change_amount_or_currency_changed" CHECK (
    "salary_change"."previous_amount" <> "salary_change"."new_amount" or "salary_change"."previous_currency_code" <> "salary_change"."new_currency_code"
  )
);

ALTER TABLE "employee" ADD CONSTRAINT "employee_country_code_country_code_fk" FOREIGN KEY ("country_code") REFERENCES "public"."country"("code") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "employee" ADD CONSTRAINT "employee_department_id_department_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."department"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "employee" ADD CONSTRAINT "employee_salary_currency_code_currency_code_fk" FOREIGN KEY ("salary_currency_code") REFERENCES "public"."currency"("code") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "salary_change" ADD CONSTRAINT "salary_change_employee_id_employee_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employee"("employee_id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "salary_change" ADD CONSTRAINT "salary_change_previous_currency_code_currency_code_fk" FOREIGN KEY ("previous_currency_code") REFERENCES "public"."currency"("code") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "salary_change" ADD CONSTRAINT "salary_change_new_currency_code_currency_code_fk" FOREIGN KEY ("new_currency_code") REFERENCES "public"."currency"("code") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "salary_change" ADD CONSTRAINT "salary_change_editor_user_id_user_id_fk" FOREIGN KEY ("editor_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;
CREATE INDEX "employee_full_name_employee_id_idx" ON "employee" USING btree ("full_name","employee_id");
CREATE INDEX "employee_country_code_idx" ON "employee" USING btree ("country_code");
CREATE INDEX "employee_department_id_idx" ON "employee" USING btree ("department_id");
CREATE INDEX "employee_full_name_trgm_idx" ON "employee" USING gin (lower("full_name") gin_trgm_ops);

CREATE FUNCTION "public"."validate_salary_scale"(salary_amount numeric, currency_code text)
RETURNS void
LANGUAGE plpgsql
STRICT
SET search_path = pg_catalog, public
AS $$
DECLARE
	currency_scale smallint;
BEGIN
	SELECT minor_units INTO currency_scale
	FROM public.currency
	WHERE code = currency_code
	FOR KEY SHARE;

	IF NOT FOUND THEN
		RAISE EXCEPTION 'Salary currency is unsupported' USING ERRCODE = 'foreign_key_violation';
	END IF;

	IF scale(salary_amount) > currency_scale THEN
		RAISE EXCEPTION 'Salary amount exceeds the currency decimal precision'
			USING ERRCODE = 'check_violation', CONSTRAINT = 'salary_amount_scale';
	END IF;
END;
$$;

CREATE FUNCTION "public"."enforce_salary_scale"()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
	IF TG_TABLE_NAME = 'employee' THEN
		PERFORM public.validate_salary_scale(NEW.annual_base_salary, NEW.salary_currency_code);
	ELSE
		PERFORM public.validate_salary_scale(NEW.previous_amount, NEW.previous_currency_code);
		PERFORM public.validate_salary_scale(NEW.new_amount, NEW.new_currency_code);
	END IF;

	RETURN NEW;
END;
$$;

CREATE TRIGGER "employee_salary_scale"
BEFORE INSERT OR UPDATE OF "annual_base_salary", "salary_currency_code" ON "public"."employee"
FOR EACH ROW EXECUTE FUNCTION "public"."enforce_salary_scale"();

CREATE TRIGGER "salary_change_amount_scale"
BEFORE INSERT ON "public"."salary_change"
FOR EACH ROW EXECUTE FUNCTION "public"."enforce_salary_scale"();

CREATE FUNCTION "public"."reject_currency_precision_update"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
	RAISE EXCEPTION 'Currency decimal precision cannot be updated'
		USING ERRCODE = 'check_violation', CONSTRAINT = 'currency_minor_units_immutable';
END;
$$;

CREATE TRIGGER "currency_minor_units_immutable"
BEFORE UPDATE OF "minor_units" ON "public"."currency"
FOR EACH ROW WHEN (OLD.minor_units IS DISTINCT FROM NEW.minor_units)
EXECUTE FUNCTION "public"."reject_currency_precision_update"();

CREATE FUNCTION "public"."reject_salary_history_mutation"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
	RAISE EXCEPTION 'Salary history is append-only' USING ERRCODE = 'object_not_in_prerequisite_state';
END;
$$;

CREATE TRIGGER "salary_change_append_only"
BEFORE UPDATE OR DELETE OR TRUNCATE ON "public"."salary_change"
FOR EACH STATEMENT EXECUTE FUNCTION "public"."reject_salary_history_mutation"();
