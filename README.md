# Joel's personal introduction website

A small website made with **HTML and CSS only**. The layout and styles are in `index.html`; the Headwind project illustration is in `assets/headwind-cover.jpg`. No installation, JavaScript, frameworks, or build step is needed.

Joel introduces himself as a software developer and game designer, and a current master's student at KIC. His core competencies are Software Development, followed by Machine Learning & AI. The Headwind showcase links to the real game and explains its head controls. The other interests are a suggested draft based on his creative interests; edit any text that does not feel right. No photo, email address, or location is included.

The project cover is AI-generated artwork based on a real game screenshot. Its prompt and provenance are recorded in `assets/README.md`. The showcase uses a normal link to the game; it does not start a camera or embed a running game. The expandable explanation uses HTML `<details>` and works without JavaScript.

## 1. Open GitHub Codespaces

1. Open this repository on GitHub.
2. Click the green **Code** button.
3. Select **Codespaces**.
4. Click **Create codespace on main**. Wait for the editor to open.

GitHub may show your Codespaces allowance before creation. Use the default small machine; this page needs very little computing power. Stop the Codespace when you finish: open the bottom-left menu, then select **Stop Current Codespace**, or stop it at https://github.com/codespaces.

## 2. Preview the website

1. In Codespaces, click **Terminal → New Terminal**.
2. Type this command and press Enter:

```sh
python3 -m http.server 8000
```

3. Click **Open in Browser** in the message that appears.
4. If you do not see the message, open the **Ports** tab near the terminal. Find port `8000` and click its browser icon. Keep this preview port private.

Keep the terminal running while you preview. After editing, save `index.html` with **Ctrl+S** (Mac: **Cmd+S**) and refresh the preview tab. Press **Ctrl+C** in the terminal to stop the preview server.

Python only serves the local preview. The published website uses HTML and CSS only.

## 3. Make a small change

Click `index.html` in the left file list. Look for the comments, such as `Edit your name and introduction here`. Change a sentence, save, and refresh the preview.

The colors are near the top, inside `:root`. For example, `--red` sets the accent color.

## 4. Save your changes to GitHub

A **commit** saves a version of your files. **Push** uploads that version to GitHub.

In the Codespaces terminal, run these commands one at a time:

```sh
git add index.html
git commit -m "Update my introduction"
git push
```

If you added a photo, use `git add index.html profile.jpg` for the first command. If Git says "nothing to commit", there are no new saved changes.

You can also use the Source Control icon on the left: review changes, click **+** to stage them, enter a short message, select **Commit**, then **Sync Changes** or **Push**.

## 5. Publish with GitHub Pages

1. Open the repository on GitHub (not the Codespaces editor).
2. Click **Settings**.
3. Click **Pages** in the left menu.
4. Under **Build and deployment**, set **Source** to **Deploy from a branch**.
5. Under **Branch**, choose **main** and **/(root)**.
6. Click **Save** and wait for GitHub to finish publishing.
7. Refresh the Pages settings. Click **Visit site** when it appears.

For the `joel-introduction` repository on the `joel-wa` account, the website address is:

https://joel-wa.github.io/joel-introduction/

This is the public website address. The private preview address from Codespaces is different. Future pushes to `main` update the public website after GitHub finishes deployment.

The file `index.html` is in the root folder. `.nojekyll` tells GitHub to serve these files without Jekyll processing. Links within the page use section anchors, so they work under the repository URL.

## Optional: add a photo later

1. In Codespaces, right-click an empty area in the left **Explorer** file list and choose **Upload**. Select your photo. You can also drag the file into the Explorer.
2. Rename the uploaded file to `profile.jpg` (use a real JPG image; for PNG, use `profile.png` instead).
3. In `index.html`, find `<h1 id="hello">`. Add this line immediately **above** that line:

```html
<img class="profile-photo" src="profile.jpg" alt="Portrait of Joel Assiakwa" width="88" height="88">
```

4. Save, refresh the preview, then commit and push both files. If the image is PNG, change `src` to `profile.png`.

Use the exact filename, including capital letters. A relative path such as `profile.jpg` works with GitHub Pages. Choose a photo you are comfortable sharing publicly.

## If something does not work

- **The public site shows 404:** check that Pages uses `main` and `/(root)`, then wait for deployment to complete. Check the repository's **Actions** tab for a failed deployment.
- **Your latest text is missing:** save the file, commit, push, wait for deployment, then refresh the page.
- **A photo is missing:** check the filename, extension, and capital letters. Make sure the photo was committed and pushed.
- **You only see the README:** confirm that the lowercase `index.html` file is in the repository root.

## GitHub's guides

- [Create a Codespace](https://docs.github.com/en/codespaces/developing-in-a-codespace/creating-a-codespace-for-a-repository)
- [Commit and push in Codespaces](https://docs.github.com/en/codespaces/developing-in-a-codespace/using-source-control-in-your-codespace)
- [Configure GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
