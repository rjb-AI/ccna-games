---
command: IOS CLI prompts and parser error messages
source: https://www.cisco.com/c/en/us/td/docs/ios/fundamentals/configuration/guide/12_2sr/cf_12_2sr_book/cf_cli-basics.html
source_title: Cisco IOS Configuration Fundamentals Configuration Guide, Release 12.2SR - Using the Cisco IOS Command-Line Interface
platform: Cisco IOS 12.2SR (chapter "Last Updated: April 15, 2010"). The same examples also appear in the IOS XE 15.1S chapter, see Notes.
retrieved: 2026-11-28
verified: read twice in different ways. (1) WebFetch of the HTML page. (2) The PDF of the same chapter (https://www.cisco.com/c/en/us/td/docs/ios/fundamentals/configuration/guide/12_2sr/cf_12_2sr_book/cf_cli-basics.pdf), with text pulled out exactly by pdftotext, not by a model. Every line below matched in both reads. Caret columns: see Notes.
---

Sample 1: prompts. The section that introduces interface configuration mode ("In the following example, the user enter interface configuration mode for serial interface 0. The new prompt, hostname(config-if)#, indicates interface configuration mode."). Also the privileged EXEC and global configuration examples from the same chapter.

~~~text
Router> enable
Password:<letmein>
Router#
~~~

~~~text
Router# configure terminal
Enter configuration commands, one per line. End with CNTL/Z.
Router(config)#
~~~

~~~text
Router(config)# interface serial 0
Router(config-if)#
~~~

"Table 1 Summary of the Main Cisco IOS Command Modes" (prompts and access methods quoted; exit methods shortened):

| Command Mode | Access Method | Prompt | Exit Method |
|---|---|---|---|
| User EXEC | Log in. | `Router>` | Use the logout command. |
| Privileged Exec | From user EXEC mode, use the enable Exec command. | `Router#` | To exit to user EXEC mode, use the disable command. |
| Global configuration | From privileged EXEC mode, use the configure terminal command. | `Router(config)#` | To exit to privileged EXEC mode, use the end command or press Ctrl-Z. |
| Interface configuration | From global configuration mode, enter by specifying an interface with an interface command. | `Router(config-if)#` | To exit to global configuration mode, use the exit command. To exit to privileged EXEC mode, use the end command or press Ctrl-Z. |
| Subinterface configuration | From interface configuration mode, specify a subinterface with an interface command. | `Router(config-subif)#` | (same as interface) |

Sample 2: parser errors. The "Getting Context-Sensitive Help" section ("the caret symbol in the following output shows the letter that was mistyped in the command:") and the "Determining Command Syntax and Using Command History: Example" section.

~~~text
Router# configure terminal
                     ^
% Invalid input detected at '^' marker.

Router#
~~~

~~~text
Router# clock set 13:32:00
% Incomplete command.
~~~

~~~text
Router# clock set 13:32:00 23 February 01
                                        ^
% Invalid input detected at '^' marker.
~~~

Ambiguous command. Not in the 12.2SR chapter. Taken from the "Common CLI Error Messages" table of a second Cisco IOS XE source:

- source: https://www.cisco.com/en/US/docs/wireless/controller/3.2_0_se/cleanair/b_ca_32se_5700_cr_chapter_01.html
- source_title: Using the Command-Line Interface [Cisco 5700 Series Wireless LAN Controllers]
- platform: Cisco IOS XE 3.2SE (5700 WLC; the prompts on this page use the hostname "Controller")
- verified: two fetches agreed word for word on all three rows

| Error Message | Meaning |
|---|---|
| `% Ambiguous command: "show con"` | You did not enter enough characters for your controller to recognize the command. |
| `% Incomplete command.` | You did not enter all the keywords or values required by this command. |
| `% Invalid input detected at '^' marker.` | You entered the command incorrectly. The caret (^) marks the point of the error. |

The table's "How to Get Help" column: for Ambiguous and Incomplete, "Reenter the command followed by a question mark (?) with a space between the command and the question mark." For Invalid input, "Enter a question mark (?) to display all the commands that are available in this command mode."

## Notes
- Exact error text: `% Invalid input detected at '^' marker.` (ends with a period, ^ in single quotes), `% Incomplete command.` (ends with a period), and `% Ambiguous command: "<what was typed>"` (the typed text in double quotes, no period). The ^ marker goes on its own line, under the position of the error, before the % line.
- Caret columns. The "configure terminal" caret sits under character 21 of the prompt line, the "m" of "terminal". The HTML and PDF reads agree on this. The page says the caret "shows the letter that was mistyped", but the command as printed is spelled correctly. The original example probably had a typo (for example "termnial") that was later corrected in the text but not in the caret. So treat it as an example of format, not of where the caret really lands.
- In the clock example, the pdftotext layout puts the caret under character 40 (the "1" of "01"). The HTML read could not settle the exact column because of bold markup. The page says the caret indicates "an error at 01". The exact column has not been confirmed from a second source.
- The "Router# configure terminal" error example has a blank line before the final "Router#" in the 12.2SR version. The IOS XE 15.1S version of the same chapter (https://cisco.com/en/US/docs/ios-xml/ios/fundamentals/configuration/15-1s/Using_the_Cisco_IOS_Command-Line_Interface.pdf, also read with pdftotext) has no blank line. It also writes the clock example as "Router# clock set 13:32:00 February 01" (month before day), with "% Incomplete command." after "Router# clock set 13:32:00". The wording otherwise matches.
- The "Password:<letmein>" line is the page's illustration. The page says "the password will not be displayed as you type, but is shown here for illustrational purposes." A real device shows "Password:" with no echo.
- "Router(config)# interface serial 0" uses an old interface name. The prompt change to "(config-if)#" is the point.
- Spacing after the prompt is not consistent in Cisco docs. Configuration guides and command references write "Router# configure terminal" (with a space). Tech-note captures write "R1#show ip route" (no space; see show-ip-route.md). Which one a real device prints is not settled by these sources.
