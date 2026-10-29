# Joel Assiakwa — A curious practice

A personal introduction, portfolio, and cooking/travel journal. Built with plain HTML, CSS, and small JavaScript modules. No framework, build step, or installation is required to view or publish it.

## Find your way around

The chapter index stays on the left on a computer and becomes a bottom navigation dock on a phone. It highlights the current chapter. The top-right Motion switch disables decorative movement. The site also respects your device's reduced-motion preference.

The kitchen has a scroll-led horizontal photo journey on larger computers. Phones, smaller windows, and Motion off use a native swipe gallery with arrow buttons. Open a photo to see it full-size; **Show original** compares the AI-refined image with Joel's original shot. Escape closes the viewer. Keyboard arrows change photos.

## Hands-free experience

The entrance offers **Try hands-free** and **Use mouse or touch** as separate choices. You can reopen it with the Hands-free button.

The center box stays open during camera permission and model loading, showing Camera → AI model → Ready. Setup can be cancelled at any stage. Once the model is ready, the center box transitions out and the small control panel takes over. Errors stay in the center during setup, with retry and normal-browsing choices.

- Camera access begins only after choosing Try hands-free.
- Look straight briefly to get ready. Look down to scroll down; look up to scroll up; look straight to stop.
- Turn off releases the camera. Hiding/leaving the page also releases it.
- Camera frames are processed in the browser, never uploaded by this website. Audio is never requested.
- The trained Teachable Machine pose model and TensorFlow download only after choosing hands-free. The same model is used by Headwind.
- Low-confidence or missing-face predictions stop scrolling. A pose must persist before it can scroll. Old predictions expire. Mouse/touch/keyboard input briefly pauses head navigation; an open dialog stops it.
- On a native swipe gallery, head navigation moves through the photos before continuing down the page.
- Lighting and position affect the model. This is an experimental alternative, so standard navigation is always available. The model may need more training examples to work consistently for different visitors.

## 1. Open Codespaces

Open the repository on GitHub. Choose **Code → Codespaces → Create codespace on main**. Use the default small machine. Stop your Codespace when finished at https://github.com/codespaces.

## 2. Preview

In Codespaces choose **Terminal → New Terminal**, then run:

~~~sh
python3 -m http.server 8000
~~~

Click **Open in Browser**. If the message is missing, use the browser icon beside port 8000 in the **Ports** tab. Keep the port private. Save files with Ctrl+S, then refresh. Ctrl+C stops the server. Use the HTTPS forwarded URL to try the camera.

## 3. Edit

- `index.html`: your name, introduction, skills, work, and journal text.
- `style.css`: colors, typography, layouts, responsive rules, and motion styles. Colors start in `:root`.
- `experience.js`: persistent navigation, gallery, photo viewer, and entrance choices.
- `head-scroll.js`: camera lifecycle and the head-scroll policy.
- `assets/food/`: web images and the image-edit prompts. Original photos are in `assets/food/originals/`.

Software Development is followed by Machine Learning & AI as core competencies. Joel is a master's student at KIC and is from Ghana. Countries visited: India, Canada, Japan, the Netherlands, Angola, and the United Arab Emirates (Dubai). Japan's list includes Weathercock House, Kobe Port Tower, and BE KOBE. Matsumoto Castle is not listed as visited.

The three dishes are described visually as egg-topped pasta, omelette & cereal, and noodles & chicken. Update these labels if Joel provides more specific dish names. Travel photos can be added when supplied; the page does not invent visit photographs or dates.

## 4. Commit and push

A commit saves a version. Push uploads it to GitHub. Review changes in Source Control, or run:

~~~sh
git add index.html style.css experience.js head-scroll.js assets
git commit -m "Update my website"
git push
~~~

Include any changed tests or documentation too. If Git says "nothing to commit", there are no new saved changes.

## 5. GitHub Pages

The repository already publishes from **Settings → Pages → Deploy from a branch → main → /(root)**. Future pushes update the website after deployment:

https://joel-wa.github.io/joel-introduction/

Keep the lowercase `index.html` in the repository root. `.nojekyll` serves the static files directly. All local asset/module paths are relative, so they work beneath the repository URL. No server code is deployed.

## Check the camera logic

Node is needed only for development checks, not to publish the site:

~~~sh
npm test
~~~

Tests cover pose direction, confidence and neutral gating, permissions, duplicate starts, cancellation, late camera/model responses, video/model errors, stream cleanup, stale predictions, manual input, modals, and hidden pages. Browser QA also loaded the real TensorFlow/Teachable Machine model and ran it on synthetic video, confirming that no face causes no scrolling. These tests do not establish tracking accuracy for every human face or camera.

## Design research and image provenance

Live project references studied for interaction principles:

- https://hiyachu-tabeyo.studio.site/ — motion linked to the food's subject.
- https://cockdoodoodoo.studio.site/ — clear navigation and a distinctive visual voice.
- https://a-daily-life-like-scrolling.studio.site/ — a scroll-driven illustrated experience.

The page uses its own layouts, images, and copy. No reference artwork or website source was copied.

Food edits were made with the built-in ImageGen tool from Joel's three original photographs. Prompts and notes: `assets/food/README.md`. Headwind cover: `assets/README.md`. Food images are labelled as AI-refined, and the viewer retains an original-photo comparison.

Technical reference: https://github.com/googlecreativelab/teachablemachine-community/tree/master/libraries/pose

## Troubleshooting

- **404:** check Pages uses main and /(root), and check the Actions tab for a completed deployment.
- **Old content:** save, commit, push, wait for deployment, then refresh.
- **Missing image:** check the path and capital letters, and commit the image too.
- **Camera blocked or busy:** use normal controls, or allow the camera in the address-bar settings and close other camera apps before retrying.
- **Motion feels distracting:** choose Motion off. All chapters and photo controls remain available.
