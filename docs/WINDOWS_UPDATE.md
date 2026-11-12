# Update the Windows copy used by Expo Go

These simulator changes are pushed to GitHub's `work` branch. A folder downloaded as a ZIP does not update automatically.

1. In the existing Command Prompt running Metro, press Ctrl+C. Confirm Y if Windows asks to terminate the batch job.
2. Download the latest `work` ZIP: https://github.com/Gittoski/poker-academy/archive/refs/heads/work.zip . Extract it into a separate folder.
3. In the newly extracted project, locate `App.tsx` and the `src` folder.
4. Copy **App.tsx and the whole src folder** into your existing project folder (the folder with package.json and node_modules). Merge the src folders and replace the old app source files when Windows asks. Keep the existing node_modules folder and package files.
5. Open Command Prompt in the existing project and run `npm start`. No new dependencies were added for this update.
6. Keep computer and iPhone on the same Wi-Fi, scan the QR code, and open in Expo Go using the same Expo account as before.

The app now opens at the simulator. Existing learning progress is retained. Older table saves migrate when loaded; new saved reviews begin with the information previously available, so hands that were never recorded cannot be recovered.

## Check the new loop

1. Choose Coached hands. This starts a 100-BB first-in exercise, not a GTO solver session.
2. Make a decision, inspect feedback, and use Show decision chart where covered.
3. Tap Retry this decision and verify the same cards, stacks and price return. Try a different legal choice.
4. Finish a hand and tap Next hand.
5. Open Saved hands & practice. Inspect troublesome spots and practice one, then Return to live table.
6. Open Saved hands and step through a recorded hand. Practice one of your decisions from that review.
7. Close/reopen the app and verify the saved library is still present.

The notebook retains up to 30 completed hand branches and 200 decision attempts. Unresolved repeated baseline deviations appear first. First tries and retries remain separate. Unknown strategy spots are not graded. This device check has not been performed on the new version by the assistant.
