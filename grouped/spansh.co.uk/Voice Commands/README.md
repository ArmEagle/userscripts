# Spansh Route Planner Voice Commands

This userscript runs on the route planners on https://www.spansh.co.uk/ (Neutron Router only really tested).

The script adds buttons to the the page (visible) with so called [access keys (MDN)](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/accesskey). This easily combines with [Voice Attack](https://voiceattack.com/) voice commands so you can just utter a command and have the next system selected, spoken out, and copied to clipboard. If setup correctly, you don't even need to have the browser in view (ideal for VR play!).

**Note:** I only tested this script in Firefox, in [GreaseMonkey](https://addons.mozilla.org/en-US/firefox/addon/greasemonkey/).

## Installation
Requires a tool like [GreaseMonkey](https://addons.mozilla.org/en-US/firefox/addon/greasemonkey/).

[click here to install](https://github.com/ArmEagle/userscripts/raw/master//grouped/spansh.co.uk/Voice%20Commands/script.user.js)

## Buttons

Note that the way hotkeys work depend on browsers. See [access keys (MDN)](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/accesskey). But summarized: it is _Alt+Shift+key_ (or no shift) or _Command+Alt+key_ for MacOS.

### Focus Current
**Hotkey:** . (period)

Repeats the current system.

### Copy Current
**Hotkey:** c

Repeats the current system and copies the current system name to clipboard.

### Mark Current
**Hotkey:** ! (exclamation mark)

Toggles the checkbox for the current system and also executes 'Copy Current' (unless setting `Constants.currentSystemClass` is changed).

### Go Next
**Hotkey:** ] (right square bracket)

Goes to the next system (row) and executes 'Copy Current'.

### Go Previous
**Hotkey:** [ (left square bracket)

Goes to the previous system (row) and executes 'Copy Current'.

## Text to Speech

This userscript uses [SpeechSynthesisUtterance (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesisUtterance) to speak out each of these actions.

## Usage with Voice Attack

The script starts with setting the title of the page to "SpanSH VR Commands". This makes it easy to setup voice commands to target this specific window. I recommend you use this in one separate window, or just keep this tab focused when you want to continue.

Note; you do NOT need to have focus on this browser window when you use the voice commands like I did here.

I have setup the four commands (so I don't use all of the buttons above) as shown below.

### 'route last system'
- Check **When I say:** and fill "route last system".
- In **When this command executes, do the following sequence:**
   - **Key Press:** Press Left Alt+Left Shift+[ and hold for 0,1 seconds and release
   - **Other > Voice Attack Action > Execute Another Command**
      - Select **Execute selected command** and choose 'Focus Elite Dangerous' (this is defined further down, sorry, go there first and continue here).
- Check **Send command to this target:**.
   - Select the second radio option and select the "SpanSH VR commands - Mozilla Firefox" window (obviously you need SpanSH with the userscript already open to be able to select that window once).

### 'route next system'
Similar but with Alt+Shift+] (right bracket).

### 'route system copy'
Similar but with Alt+Shift+c.

### 'route system paste'
This is actually used inside the game when you have the Galaxy Map open and when you have input focus on the system search input field.

This is an alias to my 'clipboard paste' command (so use "execute another command).

'clipboard paste' simply has the keypress 'Press Left Ctrl+V and hold for 0,1 seconds and release'. Sometimes it helps to have different commands for the same thing.

### 'Focus Elite Dangerous'
A command I have to use quite often when I use OVRDrop (no link, I think there are better VR overlay tools now) to focus my browser for other actions than this.

This command is used by the first three commands above to return focus to the game.

- Check **When I say:** and fill 'Focus Elite Dangerous'.
- **Other > Windows > Perform a Window function**
   - **Window Title** select "Elite Dangerous (CLIENT)" (obviously you need to have the game client completely running to be able to select it here).
   - Select **Display** and in the dropdown "Show".
   - Below that check **Set command to target this window**.

### Example Voice attack configuration for 'route system copy'
![Example setup](https://github.com/ArmEagle/userscripts/raw/master/grouped/spansh.co.uk/Voice%20Commands/spansh-example.jpg)
