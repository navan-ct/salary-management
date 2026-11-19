# Create app walkthrough video

## User

Create a good video walkthrough of the app. Use the live demo link for the screen recording. Show only the app screen in the video and nothing else. The email and password are the same ones in our local `.env`. The video should have captions at the bottom, walking the viewer through the demo. Cover sign-in, employee directory, employee record, changing salary, and pay insights. Cover only the relevant states.

Save the video to the repo. Update `README.md` in its minimalistic style.


## Assistant

I’ll check the live demo link and the app’s main flows, then record the walkthrough, add bottom captions, and link the finished video from the README.

## Assistant

Saving a salary change adds a permanent entry to the live demo’s history. Should the recording include one clearly labeled walkthrough change to a seeded employee?
- Save one demo change and show the history entry
- Show the completed form and stop before saving

## Assistant

I verified the live sign-in and found the seeded employee shown in the directory’s search example. I’ll follow that record through the salary form, then show how Pay insights breaks down headcount and median pay by department in India.

## User

<send_user_message_question_reply>
[{"questionItemId":"[\"request_user_input_async\",\"call_116132053fc9431d9c37e6b7ad3aff54\",0]","question":"Saving a salary change adds a permanent entry to the live demo’s history. Should the recording include one clearly labeled walkthrough change to a seeded employee?","answer":"Save one demo change and show the history entry"}]
</send_user_message_question_reply>


## Assistant

The recording captured the approved change from INR 955,000 to INR 980,000 and the new history entry. I’ll now trim the waits, add the captions, and check that they leave the salary fields and report figures readable.

## Assistant

Saved the 50-second walkthrough to the repo and linked it from the [README](</Users/navaneethct/Projects/Job Search/Incubyte/salary-management/README.md>).

The video shows only the live app, with bottom captions covering sign-in, employee search, the employee record, and Pay insights. It includes the approved salary change from INR 955,000 to INR 980,000 and its saved history entry.

![Watch the captioned walkthrough](</Users/navaneethct/Projects/Job Search/Incubyte/salary-management/docs/assets/walkthrough.mp4>)

`npm run check:commit` and `npm run check` both passed.

## User

A few things:

1. Save the video in the root. Remove the `docs` folder also, since it'll be empty.
2. Don't use zoom or crop the app screen. The entire screen should be shown for every flow.
3. The captions should be describing the flow only. It shouldn't reiterate the specific things that are happening on the screen.
4. Wait a small and appropriate amount of time after a caption, before doing the action associated with it. This is so that a viewer would read the caption first, and then follow its action.
5. Separate the distinct flows by a full-page title. The underlying video should be continuous however, i.e., the first frame of a flow should be the last frame of the flow before it.


## Assistant

I’ll re-edit the original live capture so the full app stays in frame, with a title card for each flow and time to read each caption before its action. Then I’ll move the finished video to the repo root and update the README link.

## Assistant

The revised cut is 68 seconds. Each caption appears 2.4–3.2 seconds before its action, and I verified that the app frames on either side of all four title-card transitions are pixel-identical.

## Assistant

Saved the revised 68-second walkthrough in the repo root, updated the [README](</Users/navaneethct/Projects/Job Search/Incubyte/salary-management/README.md>), and removed `docs/`.

All five flows show the full app screen at its original size. Each opens with a full-page title, and each caption gives viewers 2.4–3.2 seconds to read before the action starts. I verified that the app resumes on the exact same frame after every title transition.

![Play the revised walkthrough](</Users/navaneethct/Projects/Job Search/Incubyte/salary-management/walkthrough.mp4>)

The video and README are staged. Both repository checks passed.

## User

Much better. Few more things:

1. Let's combine the employee directory and employee record flows into a single flow in the video.
2. Had you made cuts to the loading states? If yes, don't do that. The screen recording should include everything a person would see when using the app.
3. The video feels jumpy and hard to watch through at times, especially the switches between the recording and the title, etc. It could be solved by adjusting the timing or something like that. Please fix everything so that watching the video would be a good and smooth experience for a viewer. They should be able to clearly understand everything that is shown.


## Assistant

Yes. I cut the loading states from the earlier edit. I’ll make a fresh continuous recording of the live demo, keep the waits and transitions, and combine the directory and employee record into one flow. I’ll also soften the title transitions and check the pacing around each action.

## Assistant

The first recording used the one approved live salary change. For this continuous take, may I restore the same seeded employee’s original INR 955,000 salary and label the new history entry as a walkthrough restoration?
- Restore the original salary and record the save
- Show the draft and existing history without a second save

## User

<send_user_message_question_reply>
[{"questionItemId":"[\"request_user_input_async\",\"call_763f8cf127a040dfa13a38574f54c933\",0]","question":"The first recording used the one approved live salary change. For this continuous take, may I restore the same seeded employee’s original INR 955,000 salary and label the new history entry as a walkthrough restoration?","answer":"Restore the original salary and record the save"}]
</send_user_message_question_reply>


## Assistant

The host showed its own wake-up page on the first visit. I’ll use a fresh session now that the demo is awake, so the recording stays on the app and includes its actual loading screens, clicks, and save confirmation.

## Assistant

The new take captured the full trip from opening the demo to the department report, including the app’s session checks, searches, page loads, and save. The employee’s salary is back at INR 955,000. I’ll now check the title dissolves and caption timing against that recording.

## Assistant

Yes, the earlier edit skipped loading states. The new 1-minute-28-second walkthrough uses one continuous recording from the live demo after the host woke up. It preserves the app’s loading and saving states at their original speed.

Employee search and record review now share one chapter. The titles fade in and out over the same app frame, and each caption gives viewers about three seconds to read before the action begins.

![Play the revised walkthrough](</Users/navaneethct/Projects/Job Search/Incubyte/salary-management/walkthrough.mp4>)

The recorded save restored the employee’s original INR 955,000 salary and added the approved history entry. Both repository checks passed.

## User

Almost there. Two more things:

1. The loading and layout shift at the very beginning for the screen recording looks weird. Let's start from a fully loaded sign-in page. Everything else looks good in the recording.
2. The full-page titles looked better with the green background. Let's have that while still having the video look as smooth as it is right now.


## Assistant

I’ll trim the opening to the settled sign-in page and bring back the green title cards. I’ll reuse the existing capture and check the transitions so the rest keeps the pacing you liked.

## Assistant

The green opening card now dissolves directly into the fully loaded sign-in form. I trimmed 1.2 seconds and verified that the later loading states, captions, and title transitions still line up with the previous edit.

## Assistant

The green opening title now dissolves directly into the fully loaded sign-in page. All four title cards use the original green palette and retain the smooth fades. Only the first 1.2 seconds of app loading were trimmed.

![Play the revised walkthrough](</Users/navaneethct/Projects/Job Search/Incubyte/salary-management/walkthrough.mp4>)

The updated video is staged. Both repository checks passed.

## User

Perfect. Please generate a commit message for our staged changes. Don't commit.


## Assistant

I’ll check the staged diff so the message matches it.

## Assistant

```text
docs: add captioned walkthrough of the live demo
```

## User

Committed and pushed. Well done.


## Assistant

Thanks! Glad the walkthrough turned out the way you wanted.
