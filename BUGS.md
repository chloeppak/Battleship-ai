# Bugs found and fixed

During browser testing and automated review, I found eight issues. All have been fixed.

1. **Incorrect legend colours:** A CSS rule caused the legend samples to display the same colour. More specific colour rules fixed it.

2. **Unreadable “Sunk” label:** The line through a sunk ship’s name also crossed out its status. The line is now applied only to the ship’s name.

3. **Player result disappeared:** The computer’s turn replaced the message showing whether the player hit or missed. The status bar now displays both results.

4. **Console error on page load:** The browser requested a missing site icon. Adding a favicon removed the error.

5. **Battle log exceeded the laptop screen:** The log grew past the bottom of smaller displays. It now stays inside a fixed area with its own scroll bar.

6. **Ship placement could freeze:** Repeated random values could make the placement code retry forever. The game now chooses from a list of valid positions, so placement always finishes.

7. **Board overflowed on phones:** Fixed-size squares pushed part of the board off narrow screens. The squares now resize, and the boards stack when needed.

8. **Battle history was incomplete:** The log deleted messages after the eighth entry. It now keeps the complete history for the current game.

## Testing

All 17 automated tests pass. I also played full games at laptop and phone sizes, checked the browser console, and tested the published version.
