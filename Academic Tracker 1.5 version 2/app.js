/* ==========================================================
   ACADEMIC TRACKER 1.5
   Frontend-only app. Data is saved in this browser.
   ========================================================== */

(() => {
    "use strict";

    const STORAGE_KEY = "academicTracker15";

    const DEFAULT_PROFILE = {
        fullName: "",
        displayName: "",
        institution: "Federal University of Petroleum Resources, Effurun",
        shortName: "FUPRE",
        department: "Cybersecurity",
        level: "200 Level",
        semester: "First Semester",
        session: "2026/2027",
        dailyTarget: 1,
        picture: ""
    };

    const DEFAULT_COURSES = [
        { code: "ENT 211", title: "Entrepreneurship and Innovation", units: 2 },
        { code: "COS 201", title: "Computer Programming I", units: 3 },
        { code: "CYB 201", title: "Introduction to Cybersecurity and Strategy", units: 2 },
        { code: "SEN 201", title: "Introduction to Software Engineering", units: 2 },
        { code: "CYB 203", title: "Cybercrime, Law and Countermeasures", units: 2 },
        {
            code: "FUPRE-CYB 207",
            title: "Introduction to Problem Solving with Web Application Development",
            units: 2
        },
        { code: "FUPRE-MATH 205", title: "Linear Algebra I", units: 2 }
    ];

    /* Timetable course codes, where Sunday is 0 and Monday is 1. */
    const TIMETABLE = {
        1: ["ENT 211", "SEN 201"],
        2: ["CYB 203"],
        3: ["COS 201"],
        4: ["CYB 201", "MATH 205", "CYB 207"]
    };

    const THEMES = {
        "arctic-burgundy": "Arctic Burgundy",
        ocean: "Ocean",
        forest: "Forest",
        "black-crimson": "Black Crimson",
        "slate-violet": "Slate Violet"
    };

    const PAGES = {
        home: ["Dashboard", "Welcome to your personal academic space."],
        courses: ["My Courses", "Organise your courses, modules and study units."],
        progress: ["My Progress", "See how your academic work is progressing."],
        "study-group": ["Study Group", "Study together. Grow together."],
        achievements: ["Achievements", "Celebrate your study effort and consistency."],
        settings: ["Settings", "Manage your profile and app preferences."]
    };

    let state = loadState();
    let currentPage = PAGES[location.hash.slice(1)]
        ? location.hash.slice(1)
        : "home";

    /* -------------------- Data and basic helpers -------------------- */

    function blankState() {
        return {
            version: 1,
            profile: null,
            settings: {
                theme: "arctic-burgundy",
                mode: "light"
            },
            courses: [],
            tasks: [],
            taskDate: "",
            activities: [],
            revisionUnitIds: [],
            xpClaims: [],
            group: {
                name: "CYB Brothers",
                members: []
            },
            achievements: []
        };
    }

    function loadState() {
        try {
            const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");

            if (!saved || typeof saved !== "object") {
                return blankState();
            }

            const initial = blankState();

            return {
                ...initial,
                ...saved,
                settings: {
                    ...initial.settings,
                    ...(saved.settings || {})
                },
                courses: Array.isArray(saved.courses) ? saved.courses : [],
                tasks: Array.isArray(saved.tasks) ? saved.tasks : [],
                activities: Array.isArray(saved.activities) ? saved.activities : [],
                revisionUnitIds: Array.isArray(saved.revisionUnitIds)
                    ? saved.revisionUnitIds
                    : [],
                xpClaims: Array.isArray(saved.xpClaims) ? saved.xpClaims : [],
                achievements: Array.isArray(saved.achievements)
                    ? saved.achievements
                    : [],
                group: {
                    ...initial.group,
                    ...(saved.group || {}),
                    members: Array.isArray(saved.group?.members)
                        ? saved.group.members
                        : []
                }
            };
        } catch (error) {
            console.error("Could not load Academic Tracker data:", error);
            return blankState();
        }
    }

    function saveState() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
            return true;
        } catch (error) {
            console.error("Could not save Academic Tracker data:", error);
            toast("The browser could not save this change.");
            return false;
        }
    }

    function makeId() {
        return window.crypto?.randomUUID
            ? window.crypto.randomUUID()
            : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, character => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[character]);
    }

    function nameCase(value) {
        return String(value || "")
            .trim()
            .replace(/\s+/g, " ")
            .split(" ")
            .map(word => word.split(/([-'])/).map(part => {
                if (part === "-" || part === "'") return part;
                if (!part) return "";
                return part[0].toLocaleUpperCase() + part.slice(1).toLocaleLowerCase();
            }).join(""))
            .join(" ");
    }

    function initials(value) {
        return String(value || "")
            .trim()
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map(part => part[0].toLocaleUpperCase())
            .join("") || "?";
    }

    function dayKey(date = new Date()) {
        return [
            date.getFullYear(),
            String(date.getMonth() + 1).padStart(2, "0"),
            String(date.getDate()).padStart(2, "0")
        ].join("-");
    }

    function dateFromKey(key) {
        const [year, month, day] = key.split("-").map(Number);
        return new Date(year, month - 1, day, 12);
    }

    function readableDate(date = new Date()) {
        return new Intl.DateTimeFormat(undefined, {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric"
        }).format(date);
    }

    function readableShortDate(key) {
        return new Intl.DateTimeFormat(undefined, {
            month: "short",
            day: "numeric"
        }).format(dateFromKey(key));
    }

    function setText(selector, text) {
        const element = document.querySelector(selector);
        if (element) element.textContent = text;
    }

    function toast(message) {
        let element = document.getElementById("toast-message");

        if (!element) {
            element = document.createElement("div");
            element.id = "toast-message";
            element.className = "toast";
            element.setAttribute("role", "status");
            element.setAttribute("aria-live", "polite");
            document.body.appendChild(element);
        }

        element.textContent = message;
        element.classList.add("show");

        clearTimeout(toast.timer);
        toast.timer = setTimeout(() => element.classList.remove("show"), 2600);
    }

    /* -------------------- Themes -------------------- */

    function applyAppearance() {
        const theme = Object.hasOwn(THEMES, state.settings.theme)
            ? state.settings.theme
            : "arctic-burgundy";

        const mode = ["light", "dark", "system"].includes(state.settings.mode)
            ? state.settings.mode
            : "light";

        const dark = mode === "system"
            ? Boolean(window.matchMedia?.("(prefers-color-scheme: dark)").matches)
            : mode === "dark";

        document.body.dataset.theme = theme;
        document.body.dataset.mode = dark ? "dark" : "light";

        const themeSelect = document.getElementById("theme-select");
        const modeSelect = document.getElementById("appearance-mode");

        if (themeSelect) themeSelect.value = theme;
        if (modeSelect) modeSelect.value = mode;
    }

    function bindAppearance() {
        document.getElementById("theme-select")?.addEventListener("change", event => {
            if (!Object.hasOwn(THEMES, event.target.value)) return;

            state.settings.theme = event.target.value;
            saveState();
            applyAppearance();
            toast(`${THEMES[event.target.value]} theme selected.`);
        });

        document.getElementById("appearance-mode")?.addEventListener("change", event => {
            if (!["light", "dark", "system"].includes(event.target.value)) return;

            state.settings.mode = event.target.value;
            saveState();
            applyAppearance();
            toast("Appearance setting saved.");
        });

        window.matchMedia?.("(prefers-color-scheme: dark)")
            .addEventListener?.("change", () => {
                if (state.settings.mode === "system") applyAppearance();
            });
    }

    /* -------------------- Profile and profile picture -------------------- */

    function profileMatchesFupre(profile) {
        const school = `${profile.institution || ""} ${profile.shortName || ""}`;
        return /fupre|federal university of petroleum resources/i.test(school) &&
            /cybersecurity/i.test(profile.department || "") &&
            /200/i.test(profile.level || "");
    }

    function addDefaultCoursesIfNeeded(profile) {
        /* Never replace a saved course list when profile details change. */
        if (!profileMatchesFupre(profile) || state.courses.length > 0) return;

        state.courses = DEFAULT_COURSES.map(course => ({
            id: makeId(),
            ...course,
            custom: false,
            modules: []
        }));
    }

    function compressPicture(file) {
        return new Promise((resolve, reject) => {
            if (!file.type.startsWith("image/")) {
                reject(new Error("Choose an image file."));
                return;
            }

            const url = URL.createObjectURL(file);
            const image = new Image();

            image.onload = () => {
                const max = 320;
                const ratio = Math.min(1, max / Math.max(image.width, image.height));
                const canvas = document.createElement("canvas");

                canvas.width = Math.max(1, Math.round(image.width * ratio));
                canvas.height = Math.max(1, Math.round(image.height * ratio));

                const context = canvas.getContext("2d");

                if (!context) {
                    URL.revokeObjectURL(url);
                    reject(new Error("Could not process that image."));
                    return;
                }

                context.drawImage(image, 0, 0, canvas.width, canvas.height);
                URL.revokeObjectURL(url);
                resolve(canvas.toDataURL("image/jpeg", 0.82));
            };

            image.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error("Could not open that image."));
            };

            image.src = url;
        });
    }

    function profileEditor(firstVisit = false) {
        const profile = {
            ...DEFAULT_PROFILE,
            ...(state.profile || {})
        };

        const modal = openModal(
            firstVisit ? "Set up your academic profile" : "Edit your profile",
            `
                <form id="profile-form" class="tracker-form">
                    <div class="profile-edit-layout">
                        <div class="profile-picture-preview" id="picture-preview">
                            ${profile.picture
                                ? `<img src="${escapeHTML(profile.picture)}" alt="Profile preview">`
                                : `<span>${escapeHTML(initials(profile.displayName || profile.fullName))}</span>`}
                        </div>
                        <div class="form-field">
                            <label for="profile-picture">Profile picture</label>
                            <input id="profile-picture" type="file" accept="image/*">
                            <small class="form-help">Saved in this browser only.</small>
                            <button class="text-button" id="remove-picture" type="button">
                                Remove picture
                            </button>
                        </div>
                    </div>

                    <div class="form-grid">
                        <div class="form-field">
                            <label for="full-name">Full name</label>
                            <input id="full-name" name="fullName" required maxlength="80"
                                value="${escapeHTML(profile.fullName)}">
                        </div>
                        <div class="form-field">
                            <label for="display-name">Display name</label>
                            <input id="display-name" name="displayName" required maxlength="40"
                                value="${escapeHTML(profile.displayName)}">
                            <small class="form-help">Shown on the local leaderboard.</small>
                        </div>
                        <div class="form-field full-width">
                            <label for="institution">Institution</label>
                            <input id="institution" name="institution" required maxlength="120"
                                value="${escapeHTML(profile.institution)}">
                        </div>
                        <div class="form-field">
                            <label for="short-name">Institution short name</label>
                            <input id="short-name" name="shortName" maxlength="30"
                                value="${escapeHTML(profile.shortName)}">
                        </div>
                        <div class="form-field">
                            <label for="department">Department</label>
                            <input id="department" name="department" required maxlength="80"
                                value="${escapeHTML(profile.department)}">
                        </div>
                        <div class="form-field">
                            <label for="level">Academic level</label>
                            <input id="level" name="level" required maxlength="40"
                                value="${escapeHTML(profile.level)}">
                        </div>
                        <div class="form-field">
                            <label for="semester">Current semester</label>
                            <input id="semester" name="semester" required maxlength="40"
                                value="${escapeHTML(profile.semester)}">
                        </div>
                        <div class="form-field">
                            <label for="session">Academic session</label>
                            <input id="session" name="session" required maxlength="30"
                                value="${escapeHTML(profile.session)}">
                        </div>
                        <div class="form-field">
                            <label for="daily-target">Daily task target</label>
                            <input id="daily-target" name="dailyTarget" type="number"
                                min="1" max="20" value="${Number(profile.dailyTarget) || 1}">
                        </div>
                    </div>

                    <div class="modal-footer">
                        ${firstVisit ? "" : `<button class="secondary-button" type="button" data-close-modal>Cancel</button>`}
                        <button class="primary-button" type="submit">
                            ${firstVisit ? "Save profile and continue" : "Save profile"}
                        </button>
                    </div>
                </form>
            `,
            { required: firstVisit }
        );

        let picture = profile.picture || "";

        modal.querySelector("#profile-picture").addEventListener("change", async event => {
            const file = event.target.files?.[0];
            if (!file) return;

            try {
                picture = await compressPicture(file);
                modal.querySelector("#picture-preview").innerHTML =
                    `<img src="${escapeHTML(picture)}" alt="Profile preview">`;
            } catch (error) {
                toast(error.message);
            }
        });

        modal.querySelector("#remove-picture").addEventListener("click", () => {
            picture = "";
            modal.querySelector("#profile-picture").value = "";
            modal.querySelector("#picture-preview").innerHTML =
                `<span>${escapeHTML(initials(profile.displayName || profile.fullName))}</span>`;
        });

        modal.querySelector("#profile-form").addEventListener("submit", event => {
            event.preventDefault();

            const form = event.currentTarget;
            if (!form.reportValidity()) return;

            const data = new FormData(form);

            state.profile = {
                fullName: nameCase(data.get("fullName")),
                displayName: nameCase(data.get("displayName")),
                institution: String(data.get("institution") || "").trim(),
                shortName: String(data.get("shortName") || "").trim(),
                department: nameCase(data.get("department")),
                level: String(data.get("level") || "").trim(),
                semester: nameCase(data.get("semester")),
                session: String(data.get("session") || "").trim(),
                dailyTarget: Math.max(1, Math.min(20, Number(data.get("dailyTarget")) || 1)),
                picture
            };

            addDefaultCoursesIfNeeded(state.profile);
            updateTodayTasks();
            saveState();
            modal.remove();
            renderAll();
            toast(firstVisit ? "Your profile is ready." : "Profile updated.");
        });
    }

    function renderProfileSummary() {
        const profile = state.profile;
        if (!profile) return;

        setText("#profile-name", profile.displayName || profile.fullName);
        setText("#profile-level", profile.level || "Academic Level");
        setText("#welcome-name", profile.displayName || "Student");

        setText("#welcome-academic-context", [
            profile.institution,
            profile.department,
            profile.level,
            profile.semester,
            profile.session
        ].filter(Boolean).join(" · "));

        const avatar = document.getElementById("profile-avatar");

        if (avatar) {
            avatar.innerHTML = profile.picture
                ? `<img src="${escapeHTML(profile.picture)}" alt="">`
                : escapeHTML(initials(profile.displayName || profile.fullName));
        }

        const summary = document.querySelector(".profile-summary");

        if (summary) {
            summary.tabIndex = 0;
            summary.setAttribute("role", "button");
            summary.setAttribute("aria-label", "Edit your profile");
            summary.title = "Edit your profile";
        }
    }

    function bindProfileSummary() {
        const summary = document.querySelector(".profile-summary");

        if (!summary || summary.dataset.editBound) return;

        summary.dataset.editBound = "true";
        summary.addEventListener("click", () => profileEditor());
        summary.addEventListener("keydown", event => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                profileEditor();
            }
        });
    }

    function renderProfileSettings() {
        const container = document.getElementById("profile-settings");
        if (!container || !state.profile) return;

        const profile = state.profile;

        container.innerHTML = `
            <div class="profile-edit-layout">
                <div class="profile-picture-preview">
                    ${profile.picture
                        ? `<img src="${escapeHTML(profile.picture)}" alt="">`
                        : escapeHTML(initials(profile.displayName || profile.fullName))}
                </div>
                <div>
                    <strong>${escapeHTML(profile.displayName || profile.fullName)}</strong>
                    <p class="form-help">
                        ${escapeHTML(profile.institution)} ·
                        ${escapeHTML(profile.department)} · ${escapeHTML(profile.level)}
                    </p>
                    <button class="primary-button" type="button" data-action="edit-profile">
                        Edit profile
                    </button>
                </div>
            </div>
            <div class="setting-group">
                <button class="secondary-button" type="button" data-action="export-data">
                    Export my data
                </button>
                <label class="secondary-button" for="import-data-file">Import a backup</label>
                <input id="import-data-file" type="file" accept=".json,application/json" hidden>
            </div>
            <p class="form-help">Your data is stored in this browser.</p>
        `;
    }

    /* -------------------- Navigation -------------------- */

    function goToPage(page) {
        if (!PAGES[page]) return;

        currentPage = page;

        document.querySelectorAll(".page-section").forEach(section => {
            section.classList.remove("active");
        });

        document.getElementById(`${page}-page`)?.classList.add("active");

        document.querySelectorAll(".nav-link[data-page]").forEach(link => {
            const active = link.dataset.page === page;
            link.classList.toggle("active", active);
            active
                ? link.setAttribute("aria-current", "page")
                : link.removeAttribute("aria-current");
        });

        setText("#page-title", PAGES[page][0]);
        setText("#page-subtitle", PAGES[page][1]);

        document.body.classList.remove("sidebar-open");
        document.getElementById("menu-toggle")?.setAttribute("aria-expanded", "false");

        if (page === "courses") renderCourses();
        if (page === "progress") renderProgress();
        if (page === "study-group") renderStudyGroup();
        if (page === "achievements") renderAchievements();
        if (page === "settings") renderProfileSettings();

        if (location.hash !== `#${page}`) {
            history.replaceState(null, "", `#${page}`);
        }
    }

    function bindNavigation() {
        document.querySelectorAll("[data-page]").forEach(link => {
            link.addEventListener("click", event => {
                const page = link.dataset.page;
                if (!PAGES[page]) return;
                event.preventDefault();
                goToPage(page);
            });
        });

        const menu = document.getElementById("menu-toggle");

        menu?.addEventListener("click", () => {
            const open = document.body.classList.toggle("sidebar-open");
            menu.setAttribute("aria-expanded", String(open));
        });

        document.addEventListener("click", event => {
            if (!document.body.classList.contains("sidebar-open")) return;

            const sidebar = document.getElementById("sidebar");

            if (sidebar && !sidebar.contains(event.target) && menu && !menu.contains(event.target)) {
                document.body.classList.remove("sidebar-open");
                menu.setAttribute("aria-expanded", "false");
            }
        });
    }

    /* -------------------- Course helpers and display -------------------- */

    function allUnits() {
        return state.courses.flatMap(course =>
            course.modules.flatMap(module =>
                module.units.map(unit => ({ ...unit, course, module }))
            )
        );
    }

    function courseProgress(course) {
        const units = course.modules.flatMap(module => module.units);
        if (units.length === 0) return 0;

        return Math.round(
            units.filter(unit => unit.status === "completed").length / units.length * 100
        );
    }

    function overallProgress() {
        const units = allUnits();
        if (units.length === 0) return 0;

        return Math.round(
            units.filter(unit => unit.status === "completed").length / units.length * 100
        );
    }

    function progressStyle(value) {
        const status = value >= 100
            ? "is-complete"
            : value >= 60
                ? "is-high"
                : value >= 30
                    ? "is-medium"
                    : "is-low";

        return `
            <div class="course-progress">
                <div class="progress-track" role="progressbar"
                    aria-valuemin="0" aria-valuemax="100" aria-valuenow="${value}">
                    <span class="progress-fill ${status}" style="--progress: ${value}%"></span>
                </div>
                <div class="progress-caption">
                    <span>Course progress</span><strong>${value}%</strong>
                </div>
            </div>
        `;
    }

    function renderCourses() {
        const container = document.getElementById("courses-container");
        if (!container) return;

        const context = document.getElementById("courses-academic-context");
        if (context && state.profile) {
            context.textContent = [
                state.profile.semester,
                state.profile.session,
                state.profile.department,
                state.profile.level
            ].filter(Boolean).join(" · ");
        }

        if (state.courses.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>No courses added yet.</p>
                    <span>Add a course to begin.</span>
                </div>
            `;
            return;
        }

        container.innerHTML = state.courses.map(course => `
            <article class="course-card">
                <div class="course-card-header">
                    <div>
                        <div class="course-code">${escapeHTML(course.code)}</div>
                        <h3 class="course-title">${escapeHTML(course.title)}</h3>
                        <p class="course-meta">
                            ${Number(course.units) || 0} credit units ·
                            ${course.modules.reduce((sum, module) => sum + module.units.length, 0)} units
                        </p>
                    </div>

                    <div class="course-actions">
                        <button class="text-button" type="button"
                            data-edit-course="${escapeHTML(course.id)}">Edit</button>
                        ${course.custom ? `
                            <button class="text-button" type="button"
                                data-delete-course="${escapeHTML(course.id)}">Delete</button>` : ""}
                    </div>
                </div>

                ${progressStyle(courseProgress(course))}

                <div class="course-modules">
                    ${course.modules.length
                        ? course.modules.map(module => `
                            <details class="course-module">
                                <summary>
                                    <span>${escapeHTML(module.title)}</span>
                                    <span class="course-meta">${module.units.length} units</span>
                                </summary>
                                <div class="module-content">
                                    ${module.units.map(unit => `
                                        <div class="study-unit ${unit.status === "completed" ? "is-complete" : ""}">
                                            <span class="study-unit-title">${escapeHTML(unit.title)}</span>
                                            <select data-unit-status="${escapeHTML(unit.id)}"
                                                aria-label="Progress for ${escapeHTML(unit.title)}">
                                                <option value="not-started" ${unit.status === "not-started" ? "selected" : ""}>Not started</option>
                                                <option value="in-progress" ${unit.status === "in-progress" ? "selected" : ""}>In progress</option>
                                                <option value="practicing" ${unit.status === "practicing" ? "selected" : ""}>Practicing</option>
                                                <option value="completed" ${unit.status === "completed" ? "selected" : ""}>Completed</option>
                                            </select>
                                            <button class="text-button" type="button"
                                                data-revision="${escapeHTML(unit.id)}">
                                                ${state.revisionUnitIds.includes(unit.id) ? "On revision list" : "Revise"}
                                            </button>
                                        </div>
                                    `).join("")}
                                </div>
                            </details>
                        `).join("")
                        : `<div class="empty-state"><p>No modules added yet.</p></div>`}
                </div>
            </article>
        `).join("");

        container.querySelectorAll("[data-edit-course]").forEach(button => {
            button.addEventListener("click", () => {
                const course = state.courses.find(item => item.id === button.dataset.editCourse);
                if (course) editCourse(course);
            });
        });

        container.querySelectorAll("[data-delete-course]").forEach(button => {
            button.addEventListener("click", () => deleteCourse(button.dataset.deleteCourse));
        });

        container.querySelectorAll("[data-unit-status]").forEach(select => {
            select.addEventListener("change", () => {
                setUnitStatus(select.dataset.unitStatus, select.value);
            });
        });

        container.querySelectorAll("[data-revision]").forEach(button => {
            button.addEventListener("click", () => toggleRevision(button.dataset.revision));
        });
    }

    /* -------------------- Course editor -------------------- */

    function editCourse(course = null) {
        const editing = Boolean(course);
        const original = course || {
            id: "",
            code: "",
            title: "",
            units: 2,
            custom: true,
            modules: []
        };

        const modal = openModal(
            editing ? "Edit course" : "Add a course",
            `
                <form id="course-form" class="tracker-form">
                    <div class="form-grid">
                        <div class="form-field">
                            <label for="course-code">Course code</label>
                            <input id="course-code" name="code" required maxlength="35"
                                value="${escapeHTML(original.code)}"
                                placeholder="For example, BIO 101">
                        </div>

                        <div class="form-field">
                            <label for="credit-units">Credit units</label>
                            <input id="credit-units" name="creditUnits" type="number"
                                min="0" max="30" value="${Number(original.units) || 2}">
                        </div>

                        <div class="form-field full-width">
                            <label for="course-title">Course title</label>
                            <input id="course-title" name="title" required maxlength="120"
                                value="${escapeHTML(original.title)}">
                        </div>

                        <div class="form-field full-width">
                            <label for="module-count">Number of modules</label>
                            <select id="module-count">
                                ${Array.from({ length: 21 }, (_, count) => `
                                    <option value="${count}" ${count === original.modules.length ? "selected" : ""}>
                                        ${count} module${count === 1 ? "" : "s"}
                                    </option>`).join("")}
                            </select>
                        </div>
                    </div>

                    <div id="module-editor-list"></div>
                    <p class="form-error" id="course-error" hidden></p>

                    <div class="modal-footer">
                        <button class="secondary-button" type="button" data-close-modal>Cancel</button>
                        <button class="primary-button" type="submit">
                            ${editing ? "Save course" : "Add course"}
                        </button>
                    </div>
                </form>
            `
        );

        const moduleCount = modal.querySelector("#module-count");
        const moduleList = modal.querySelector("#module-editor-list");

        function readDraftModules() {
            return [...moduleList.querySelectorAll(".module-editor-item")].map(element => ({
                id: element.dataset.moduleId,
                units: [...element.querySelectorAll(".unit-editor-row")].map(row => ({
                    id: row.dataset.unitId,
                    status: row.querySelector("[name='unitStatus']").value
                }))
            }));
        }

        function renderModuleEditors(drafts = []) {
            const count = Number(moduleCount.value) || 0;

            moduleList.innerHTML = Array.from({ length: count }, (_, moduleIndex) => {
                const savedModule = original.modules[moduleIndex];
                const draft = drafts[moduleIndex];
                const moduleId = draft?.id || savedModule?.id || makeId();

                const oldUnitCount = draft?.units?.length ?? savedModule?.units?.length ?? 0;

                return `
                    <section class="module-editor-item content-card"
                        data-module-id="${escapeHTML(moduleId)}"
                        style="margin-top: 14px;">
                        <div class="card-heading">
                            <div>
                                <h3>Module ${moduleIndex + 1}</h3>
                                <p>Module names are generated automatically.</p>
                            </div>
                        </div>

                        <div class="form-field">
                            <label for="unit-count-${moduleIndex}">
                                Number of units in Module ${moduleIndex + 1}
                            </label>
                            <select class="unit-count" id="unit-count-${moduleIndex}">
                                ${Array.from({ length: 31 }, (_, unitCount) => `
                                    <option value="${unitCount}" ${unitCount === oldUnitCount ? "selected" : ""}>
                                        ${unitCount} unit${unitCount === 1 ? "" : "s"}
                                    </option>`).join("")}
                            </select>
                        </div>

                        <div class="unit-editor-list">
                            ${renderUnitEditors(moduleIndex, oldUnitCount, savedModule, draft)}
                        </div>
                    </section>
                `;
            }).join("");
        }

        function renderUnitEditors(moduleIndex, count, savedModule, draft) {
            return Array.from({ length: count }, (_, unitIndex) => {
                const savedUnit = savedModule?.units?.[unitIndex];
                const draftUnit = draft?.units?.[unitIndex];

                const id = draftUnit?.id || savedUnit?.id || makeId();
                const status = draftUnit?.status || savedUnit?.status || "not-started";

                return `
                    <div class="form-grid unit-editor-row"
                        data-unit-id="${escapeHTML(id)}"
                        style="margin-top: 10px;">
                        <div class="form-field">
                            <label>Unit ${unitIndex + 1}</label>
                            <input type="text" value="Unit ${unitIndex + 1}" readonly>
                        </div>
                        <div class="form-field">
                            <label for="unit-status-${moduleIndex}-${unitIndex}">Progress</label>
                            <select id="unit-status-${moduleIndex}-${unitIndex}" name="unitStatus">
                                <option value="not-started" ${status === "not-started" ? "selected" : ""}>Not started</option>
                                <option value="in-progress" ${status === "in-progress" ? "selected" : ""}>In progress</option>
                                <option value="practicing" ${status === "practicing" ? "selected" : ""}>Practicing</option>
                                <option value="completed" ${status === "completed" ? "selected" : ""}>Completed</option>
                            </select>
                        </div>
                    </div>
                `;
            }).join("");
        }

        moduleCount.addEventListener("change", () => {
            const drafts = readDraftModules();
            renderModuleEditors(drafts);
        });

        moduleList.addEventListener("change", event => {
            if (!event.target.matches(".unit-count")) return;

            const drafts = readDraftModules();
            const moduleIndex = [...moduleList.children].indexOf(
                event.target.closest(".module-editor-item")
            );
            const savedModule = original.modules[moduleIndex];
            const draft = drafts[moduleIndex];
            const count = Number(event.target.value) || 0;
            const unitContainer = event.target.closest(".module-editor-item")
                .querySelector(".unit-editor-list");

            unitContainer.innerHTML = renderUnitEditors(
                moduleIndex,
                count,
                savedModule,
                draft
            );
        });

        renderModuleEditors();

        modal.querySelector("#course-form").addEventListener("submit", event => {
            event.preventDefault();

            const form = event.currentTarget;
            if (!form.reportValidity()) return;

            const data = new FormData(form);
            const code = String(data.get("code") || "").trim().toLocaleUpperCase();
            const title = String(data.get("title") || "").trim();

            const duplicate = state.courses.some(item =>
                item.code.toLocaleLowerCase() === code.toLocaleLowerCase() &&
                item.id !== original.id
            );

            const error = modal.querySelector("#course-error");

            if (duplicate) {
                error.hidden = false;
                error.textContent = "That course code is already in your course list.";
                return;
            }

            const modules = [...moduleList.querySelectorAll(".module-editor-item")]
                .map((element, moduleIndex) => {
                    const oldModule = original.modules[moduleIndex];
                    const moduleId = element.dataset.moduleId;

                    const units = [...element.querySelectorAll(".unit-editor-row")]
                        .map((row, unitIndex) => {
                            const oldUnit = oldModule?.units?.[unitIndex];

                            return {
                                id: row.dataset.unitId || oldUnit?.id || makeId(),
                                title: `Unit ${unitIndex + 1}`,
                                status: row.querySelector("[name='unitStatus']").value
                            };
                        });

                    return {
                        id: moduleId || oldModule?.id || makeId(),
                        title: `Module ${moduleIndex + 1}`,
                        units
                    };
                });

            const savedCourse = {
                id: original.id || makeId(),
                code,
                title,
                units: Math.max(0, Number(data.get("creditUnits")) || 0),
                custom: editing ? original.custom : true,
                modules
            };

            if (editing) {
                const index = state.courses.findIndex(item => item.id === original.id);
                if (index >= 0) state.courses[index] = savedCourse;
            } else {
                state.courses.push(savedCourse);
            }

            updateTodayTasks();
            saveState();
            modal.remove();
            renderAll();
            toast(editing ? "Course updated." : "Course added.");
        });
    }

    function deleteCourse(courseId) {
        const course = state.courses.find(item => item.id === courseId);
        if (!course || !course.custom) return;

        if (!confirm(`Delete ${course.code} and its modules and units?`)) return;

        const unitIds = course.modules.flatMap(module =>
            module.units.map(unit => unit.id)
        );

        state.courses = state.courses.filter(item => item.id !== courseId);
        state.tasks = state.tasks.filter(task => task.courseId !== courseId);
        state.revisionUnitIds = state.revisionUnitIds.filter(id => !unitIds.includes(id));

        saveState();
        renderAll();
        toast("Course deleted.");
    }

    function setUnitStatus(unitId, newStatus) {
        const valid = ["not-started", "in-progress", "practicing", "completed"];
        if (!valid.includes(newStatus)) return;

        const unit = allUnits().find(item => item.id === unitId);
        if (!unit || unit.status === newStatus) return;

        const wasComplete = unit.status === "completed";
        const originalUnit = state.courses
            .flatMap(course => course.modules)
            .flatMap(module => module.units)
            .find(item => item.id === unitId);

        originalUnit.status = newStatus;

        if (newStatus === "completed" && !wasComplete) {
            const claim = `unit:${unitId}`;

            if (!state.xpClaims.includes(claim)) {
                state.xpClaims.push(claim);
                addActivity({
                    id: `activity:${claim}`,
                    type: "unit",
                    label: `Completed study unit: ${originalUnit.title}`,
                    date: dayKey(),
                    xp: 25
                });
                toast("Unit completed · 25 XP earned.");
            }
        } else if (newStatus !== "completed" && wasComplete) {
            removeActivity(`activity:unit:${unitId}`);
            toast("Unit marked unfinished.");
        }

        if (newStatus === "completed") {
            state.revisionUnitIds = state.revisionUnitIds.filter(id => id !== unitId);
        }

        checkAchievements();
        saveState();
        renderAll();
    }

    function toggleRevision(unitId) {
        if (state.revisionUnitIds.includes(unitId)) {
            state.revisionUnitIds = state.revisionUnitIds.filter(id => id !== unitId);
        } else {
            state.revisionUnitIds.push(unitId);
        }

        saveState();
        renderAll();
    }

    /* -------------------- Timetable and daily tasks -------------------- */

    function cleanCourseCode(code) {
        return String(code || "")
            .toLocaleUpperCase()
            .replace(/^FUPRE[-\s]*/, "")
            .replace(/\s+/g, " ")
            .trim();
    }

    function findCourse(code) {
        const wanted = cleanCourseCode(code);
        return state.courses.find(course => cleanCourseCode(course.code) === wanted);
    }

    function weekendCourse(date) {
        if (state.courses.length === 0) return null;

        /* Friday, Saturday and Sunday cycle through available courses. */
        const offset = date.getDay() === 0 ? 2 : date.getDay() - 5;
        return state.courses[((offset % state.courses.length) + state.courses.length) % state.courses.length];
    }

    function coursesForDate(date) {
        const weekday = date.getDay();

        if (TIMETABLE[weekday]) {
            return TIMETABLE[weekday].map(findCourse).filter(Boolean);
        }

        const course = weekendCourse(date);
        return course ? [course] : [];
    }

    function updateTodayTasks() {
        const today = dayKey();
        const date = dateFromKey(today);
        const scheduledCourses = coursesForDate(date);
        const isTimetableDay = Boolean(TIMETABLE[date.getDay()]);
        const templates = [];

        if (isTimetableDay) {
            /* Class days get exactly one recall task for each scheduled course. */
            scheduledCourses.forEach(course => {
                templates.push({
                    courseId: course.id,
                    type: "Recall",
                    title: `Recall ${course.code}`
                });
            });
        } else {
            /* No-class days review one rotating course with two short tasks. */
            const course = scheduledCourses[0];
            if (course) {
                templates.push(
                    { courseId: course.id, type: "Recall", title: `Recall ${course.code}` },
                    { courseId: null, type: "Review", title: `Review an earlier topic`, detail: "Short session: revisit a topic from any course you have studied before to strengthen your understanding." }
                );
            }
        }

        const currentTasks = state.tasks.filter(task => task.date === today);
        const alreadyMatches = state.taskDate === today &&
            currentTasks.length === templates.length &&
            templates.every(template => currentTasks.some(task => task.courseId === template.courseId && task.type === template.type && task.title === template.title
            ));

        if (alreadyMatches) return;

        /* Keep the same task IDs and checked state for matching tasks. */
        const updatedTasks = templates.map(template => {
            const previous = currentTasks.find(task =>
                (template.type === "Review" || task.courseId === template.courseId) &&
                task.type === template.type &&
                task.type === template.type
            );

            return previous
                ? { ...previous, ...template }
                : { id: makeId(), date: today, ...template, completed: false };
        });

        /* Preserve other dates and all activity history while fixing today's plan. */
        state.tasks = state.tasks.filter(task => task.date !== today).concat(updatedTasks);
        state.taskDate = today;
        saveState();
    }

    function renderTodayTasks() {
        const container = document.getElementById("today-tasks");
        if (!container) return;

        updateTodayTasks();

        const tasks = state.tasks.filter(task => task.date === dayKey());

        if (tasks.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>No timetable course is set for today.</p>
                    <span>Add your courses to create a study plan.</span>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <p class="form-help" style="margin-bottom: 10px;">${escapeHTML(readableDate())}</p>
            <div class="task-list">
                ${tasks.map(task => {
                    const course = state.courses.find(item => item.id === task.courseId);

                    return `
                        <label class="task-row ${task.completed ? "is-complete" : ""}">
                            <input type="checkbox"
                                data-task-check="${escapeHTML(task.id)}"
                                ${task.completed ? "checked" : ""}>
                            <span class="task-description">
                                <strong>${escapeHTML(task.title)}</strong>
                                <span class="task-course">
                                    ${task.courseId ? escapeHTML(course?.title || "Scheduled course") : "Any course"}
                                    · ${escapeHTML(task.detail || (task.type === "Recall" ? "Active recall" : "Review"))}
                                </span>
                            </span>
                            <span class="status-badge">${task.completed ? "Complete" : "To do"}</span>
                        </label>
                    `;
                }).join("")}
            </div>
        `;

        container.querySelectorAll("[data-task-check]").forEach(checkbox => {
            checkbox.addEventListener("change", () => {
                toggleTask(checkbox.dataset.taskCheck, checkbox.checked);
            });
        });
    }

    function toggleTask(taskId, completed) {
        const task = state.tasks.find(item =>
            item.id === taskId && item.date === dayKey()
        );

        if (!task || task.completed === completed) return;

        task.completed = completed;
        const claim = `task:${task.id}`;

        if (completed) {
            if (!state.xpClaims.includes(claim)) {
                state.xpClaims.push(claim);
                addActivity({
                    id: `activity:${claim}`,
                    type: "task",
                    label: `${task.type}: ${task.title}`,
                    date: task.date,
                    xp: 15
                });
            } else {
                /* Rechecking restores streak activity without duplicate XP. */
                addActivity({
                    id: `activity:${claim}`,
                    type: "task",
                    label: `${task.type}: ${task.title}`,
                    date: task.date,
                    xp: 0
                });
            }

            toast("Task checked. Study activity recorded.");
        } else {
            /* Unchecking reverses completion and today's streak activity. */
            removeActivity(`activity:${claim}`);
            toast("Task unchecked.");
        }

        checkAchievements();
        saveState();
        renderAll();
    }

    /* -------------------- Activity, XP, streak and achievements -------------------- */

    function addActivity(activity) {
        if (state.activities.some(item => item.id === activity.id)) return;

        state.activities.unshift({
            ...activity,
            xp: Number(activity.xp) || 0
        });

        checkAchievements();
    }

    function removeActivity(activityId) {
        state.activities = state.activities.filter(item => item.id !== activityId);
    }

    function totalXP() {
        return state.activities.reduce((sum, activity) => sum + (Number(activity.xp) || 0), 0);
    }

    function currentStreak() {
        const dates = new Set(state.activities.map(activity => activity.date));
        const yesterdayDate = new Date();
        yesterdayDate.setDate(yesterdayDate.getDate() - 1);

        let cursor;

        if (dates.has(dayKey())) {
            cursor = dateFromKey(dayKey());
        } else if (dates.has(dayKey(yesterdayDate))) {
            cursor = dateFromKey(dayKey(yesterdayDate));
        } else {
            return 0;
        }

        let streak = 0;

        while (dates.has(dayKey(cursor))) {
            streak += 1;
            cursor.setDate(cursor.getDate() - 1);
        }

        return streak;
    }

    function longestStreak() {
        const dates = [...new Set(state.activities.map(activity => activity.date))].sort();
        if (dates.length === 0) return 0;

        let best = 1;
        let current = 1;

        for (let index = 1; index < dates.length; index += 1) {
            const gap = (dateFromKey(dates[index]) - dateFromKey(dates[index - 1])) / 86400000;

            if (gap === 1) {
                current += 1;
                best = Math.max(best, current);
            } else {
                current = 1;
            }
        }

        return best;
    }

    function checkAchievements() {
        const completeCount = allUnits().filter(unit => unit.status === "completed").length;

        const rules = [
            ["first-task", "First study task", "Complete a timetable study task.",
                state.activities.some(item => item.type === "task")],
            ["first-unit", "First unit completed", "Complete your first study unit.",
                completeCount >= 1],
            ["first-course", "Course finisher", "Complete all units in a course.",
                state.courses.some(course =>
                    course.modules.flatMap(module => module.units).length > 0 &&
                    courseProgress(course) === 100
                )],
            ["two-day-streak", "Building a rhythm", "Study on two consecutive days.",
                longestStreak() >= 2],
            ["seven-day-streak", "Seven days of consistency", "Study on seven consecutive days.",
                longestStreak() >= 7],
            ["ten-units", "Ten units completed", "Complete ten study units.",
                completeCount >= 10],
            ["five-hundred-xp", "500 XP earned", "Earn 500 XP through study.",
                totalXP() >= 500]
        ];

        rules.forEach(([id, title, description, earned]) => {
            if (earned && !state.achievements.some(item => item.id === id)) {
                state.achievements.push({
                    id,
                    title,
                    description,
                    date: dayKey()
                });
            }
        });
    }

    function renderStats() {
        const completed = allUnits().filter(unit => unit.status === "completed").length;
        const sessions = state.activities.filter(item => item.type === "task").length;
        const target = Number(state.profile?.dailyTarget) || 1;
        const taskCount = state.tasks.filter(task => task.date === dayKey()).length;

        setText("#current-streak", `${currentStreak()} Days`);
        setText("#total-sessions", String(sessions));
        setText("#completed-units", String(completed));
        setText("#daily-target", `${target} task${target === 1 ? "" : "s"}`);

        const targetCard = document.getElementById("daily-target")?.closest(".stat-card");
        const note = targetCard?.querySelector("p");
        if (note) note.textContent = `${taskCount} tasks scheduled today`;
    }

    function mondayOf(date = new Date()) {
        const result = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
        result.setDate(result.getDate() - ((result.getDay() + 6) % 7));
        return result;
    }

    function renderStreakCard() {
        const home = document.getElementById("home-page");
        if (!home) return;

        let card = document.getElementById("weekly-streak-card");

        if (!card) {
            card = document.createElement("section");
            card.id = "weekly-streak-card";
            card.className = "streak-card content-card";

            const welcome = home.querySelector(".welcome-section");

            if (welcome) welcome.insertAdjacentElement("afterend", card);
            else home.prepend(card);
        }

        const weekStart = mondayOf();
        const dates = new Set(state.activities.map(item => item.date));
        const names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

        card.innerHTML = `
            <div class="streak-heading">
                <div>
                    <h3>Study streak</h3>
                    <p>Show up, do the work, keep going.</p>
                </div>
                <div class="streak-current">✦ ${currentStreak()} <small>day streak</small></div>
            </div>

            <div class="streak-week">
                ${names.map((name, index) => {
                    const date = new Date(weekStart);
                    date.setDate(weekStart.getDate() + index);
                    const key = dayKey(date);
                    const complete = dates.has(key);

                    return `
                        <div class="streak-day ${complete ? "is-complete" : ""} ${key === dayKey() ? "is-today" : ""}">
                            <span class="streak-day-name">${name}</span>
                            <span class="streak-day-date">${date.getDate()}</span>
                            <span class="streak-day-indicator">${complete ? "✓" : "·"}</span>
                        </div>
                    `;
                }).join("")}
            </div>

            <p class="streak-note">
                ${dates.has(dayKey())
                    ? "You recorded study activity today."
                    : "Complete a study task today to begin or continue your streak."}
            </p>
        `;
    }

    function renderRecentActivity() {
        const container = document.getElementById("recent-activity-list");
        if (!container) return;

        if (!state.activities.length) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>No activity recorded yet.</p>
                    <span>Completed tasks and units will appear here.</span>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="activity-list">
                ${state.activities.slice(0, 8).map(item => `
                    <div class="activity-item">
                        <div class="activity-icon" aria-hidden="true">✦</div>
                        <div class="activity-item-content">
                            <strong>${escapeHTML(item.label)}</strong>
                            <span>${readableShortDate(item.date)} · ${Number(item.xp) || 0} XP</span>
                        </div>
                    </div>
                `).join("")}
            </div>
        `;
    }

    /* -------------------- Study group and local leaderboard -------------------- */

    function renderGroupPreview() {
        setText("#group-status", "Local demo");

        const container = document.getElementById("group-preview-content");
        if (!container) return;

        if (!state.group.members.length) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>Your local study group is ready.</p>
                    <span>Member activity is not synced between devices.</span>
                    <button class="primary-button" type="button" data-open-group>
                        View Study Group
                    </button>
                </div>
            `;
            container.querySelector("[data-open-group]")
                ?.addEventListener("click", () => goToPage("study-group"));
            return;
        }

        container.innerHTML = `
            <p class="form-help">Local demo · other devices are not connected.</p>
            <div class="member-list" style="margin-top: 10px;">
                ${state.group.members.slice(0, 3).map(member => `
                    <div class="group-member">
                        <div class="member-avatar">
                            ${member.picture
                                ? `<img src="${escapeHTML(member.picture)}" alt="">`
                                : escapeHTML(initials(member.name))}
                        </div>
                        <div class="member-information">
                            <strong>${escapeHTML(member.name)}</strong>
                            <span>${Number(member.xp) || 0} XP · local profile</span>
                        </div>
                    </div>
                `).join("")}
            </div>
            <button class="secondary-button" type="button" data-open-group style="margin-top: 10px;">
                Open group
            </button>
        `;
        container.querySelector("[data-open-group]")
            ?.addEventListener("click", () => goToPage("study-group"));
    }

    function renderStudyGroup() {
        const container = document.getElementById("study-group-container");
        if (!container) return;

        const members = [
            {
                name: state.profile?.displayName || "You",
                picture: state.profile?.picture || "",
                xp: totalXP(),
                streak: currentStreak(),
                me: true
            },
            ...state.group.members.map(member => ({ ...member, me: false }))
        ].sort((a, b) => (Number(b.xp) || 0) - (Number(a.xp) || 0));

        container.innerHTML = `
            <section class="content-card" style="margin-bottom: 16px;">
                <div class="card-heading">
                    <div><h3>CYB Brothers</h3><p>One study group for your academic circle.</p></div>
                    <span class="group-status">Local demo · not synced</span>
                </div>
                <p class="form-help">
                    Profiles and scores here are stored in this browser. Friends' devices
                    do not sync until a shared backend is connected.
                </p>
            </section>

            <div class="progress-grid">
                <section class="content-card">
                    <div class="card-heading">
                        <div><h3>Leaderboard</h3><p>Ranked by saved XP.</p></div>
                    </div>
                    <div class="leaderboard-list">
                        ${members.map((member, index) => `
                            <div class="leaderboard-row">
                                <span class="leaderboard-rank">#${index + 1}</span>
                                <div class="leaderboard-avatar">
                                    ${member.picture
                                        ? `<img src="${escapeHTML(member.picture)}" alt="">`
                                        : escapeHTML(initials(member.name))}
                                </div>
                                <div class="member-information">
                                    <strong>${escapeHTML(member.name)}${member.me ? " · You" : ""}</strong>
                                    <span>${Number(member.streak) || 0} day streak</span>
                                </div>
                                <span class="member-xp">${Number(member.xp) || 0} XP</span>
                            </div>
                        `).join("")}
                    </div>
                </section>

                <section class="content-card">
                    <div class="card-heading">
                        <div><h3>Group members</h3><p>Add display profiles for a local preview.</p></div>
                    </div>
                    <div class="member-list">
                        ${members.map(member => `
                            <div class="group-member">
                                <div class="member-avatar">
                                    ${member.picture
                                        ? `<img src="${escapeHTML(member.picture)}" alt="">`
                                        : escapeHTML(initials(member.name))}
                                </div>
                                <div class="member-information">
                                    <strong>${escapeHTML(member.name)}${member.me ? " · You" : ""}</strong>
                                    <span>${Number(member.xp) || 0} XP</span>
                                </div>
                                ${member.me ? "" : `
                                    <button class="text-button" type="button"
                                        data-remove-member="${escapeHTML(member.id)}">
                                        Remove
                                    </button>`}
                            </div>
                        `).join("")}
                    </div>
                    <button class="primary-button" type="button" data-add-member style="margin-top: 12px;">
                        + Add member profile
                    </button>
                </section>
            </div>
        `;

        container.querySelector("[data-add-member]")?.addEventListener("click", addMember);

        container.querySelectorAll("[data-remove-member]").forEach(button => {
            button.addEventListener("click", () => {
                state.group.members = state.group.members.filter(
                    member => member.id !== button.dataset.removeMember
                );
                saveState();
                renderStudyGroup();
                renderGroupPreview();
            });
        });
    }

    function addMember() {
        const modal = openModal(
            "Add a member profile",
            `
                <form id="member-form" class="tracker-form">
                    <div class="form-field">
                        <label for="member-name">Display name</label>
                        <input id="member-name" name="name" maxlength="40" required>
                    </div>
                    <p class="form-help" style="margin-top: 10px;">
                        Local profile only. It will not receive scores from another device.
                    </p>
                    <div class="modal-footer">
                        <button class="secondary-button" type="button" data-close-modal>Cancel</button>
                        <button class="primary-button" type="submit">Add profile</button>
                    </div>
                </form>
            `
        );

        modal.querySelector("#member-form").addEventListener("submit", event => {
            event.preventDefault();
            const form = event.currentTarget;
            if (!form.reportValidity()) return;

            const name = nameCase(new FormData(form).get("name"));

            state.group.members.push({
                id: makeId(),
                name,
                picture: "",
                xp: 0,
                streak: 0
            });

            saveState();
            modal.remove();
            renderStudyGroup();
            renderGroupPreview();
            toast("Local member profile added.");
        });
    }

    /* -------------------- Progress and activity history -------------------- */

    function renderProgress() {
        const container = document.getElementById("personal-progress-container");
        if (!container) return;

        const units = allUnits();
        const complete = units.filter(unit => unit.status === "completed").length;
        const active = units.filter(unit =>
            unit.status === "in-progress" || unit.status === "practicing"
        ).length;
        const notStarted = units.filter(unit => unit.status === "not-started").length;

        container.innerHTML = `
            <div class="statistics-grid">
                <article class="stat-card">
                    <span class="stat-label">Overall progress</span>
                    <h3>${overallProgress()}%</h3>
                    <p>${complete} of ${units.length} units completed</p>
                </article>
                <article class="stat-card">
                    <span class="stat-label">Earned XP</span>
                    <h3>${totalXP()}</h3>
                    <p>From saved study activity</p>
                </article>
                <article class="stat-card">
                    <span class="stat-label">Current streak</span>
                    <h3>${currentStreak()} days</h3>
                    <p>Longest streak: ${longestStreak()} days</p>
                </article>
                <article class="stat-card">
                    <span class="stat-label">Unit status</span>
                    <h3>${active} active</h3>
                    <p>${complete} complete · ${notStarted} not started</p>
                </article>
            </div>

            <div class="progress-grid" style="margin-top: 16px;">
                <section class="content-card">
                    <div class="card-heading">
                        <div><h3>Course progress</h3><p>Based on completed units.</p></div>
                    </div>
                    ${state.courses.length
                        ? state.courses.map(course => `
                            <div style="margin-top: 14px;">
                                <strong>${escapeHTML(course.code)} · ${escapeHTML(course.title)}</strong>
                                ${progressStyle(courseProgress(course))}
                            </div>
                        `).join("")
                        : `<div class="empty-state"><p>No courses yet.</p></div>`}
                </section>

                <section class="content-card">
                    <div class="card-heading">
                        <div><h3>Study consistency</h3><p>Last seven days.</p></div>
                    </div>
                    ${consistencyChart()}
                </section>
            </div>

            <section class="content-card" style="margin-top: 16px;">
                <div class="card-heading">
                    <div><h3>Study activity history</h3><p>Your recorded study activity.</p></div>
                </div>
                ${activityHistory()}
            </section>
        `;
    }

    function consistencyChart() {
        const today = dateFromKey(dayKey());
        const counts = new Map();

        state.activities.forEach(activity => {
            counts.set(activity.date, (counts.get(activity.date) || 0) + 1);
        });

        const days = [];

        for (let offset = 6; offset >= 0; offset -= 1) {
            const date = new Date(today);
            date.setDate(today.getDate() - offset);
            days.push({ date, count: counts.get(dayKey(date)) || 0 });
        }

        const maximum = Math.max(1, ...days.map(day => day.count));

        return `
            <div class="chart-container" style="border: 0; box-shadow: none; padding: 8px 0 0;">
                <div class="chart-bars">
                    ${days.map(day => `
                        <div class="chart-bar-column">
                            <span class="chart-bar"
                                style="height: ${day.count ? Math.max(12, day.count / maximum * 100) : 4}%"></span>
                            <span class="chart-bar-label">
                                ${new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(day.date)}
                            </span>
                        </div>
                    `).join("")}
                </div>
            </div>
        `;
    }

    function activityHistory() {
        if (!state.activities.length) {
            return `
                <div class="empty-state">
                    <p>No activity recorded yet.</p>
                    <span>Completed tasks and units will appear here.</span>
                </div>
            `;
        }

        return `
            <div class="activity-list">
                ${state.activities.slice(0, 20).map(activity => `
                    <div class="activity-item">
                        <div class="activity-icon" aria-hidden="true">✦</div>
                        <div class="activity-item-content">
                            <strong>${escapeHTML(activity.label)}</strong>
                            <span>${readableShortDate(activity.date)} · ${Number(activity.xp) || 0} XP</span>
                        </div>
                    </div>
                `).join("")}
            </div>
        `;
    }

    /* -------------------- Achievements -------------------- */

    function renderAchievements() {
        const container = document.getElementById("achievements-container");
        if (!container) return;

        checkAchievements();

        const items = [
            ["first-task", "First study task", "Complete a timetable study task.", "✦"],
            ["first-unit", "First unit completed", "Complete your first study unit.", "✓"],
            ["first-course", "Course finisher", "Complete all units in a course.", "▤"],
            ["two-day-streak", "Building a rhythm", "Study on two consecutive days.", "♨"],
            ["seven-day-streak", "Seven days of consistency", "Study on seven consecutive days.", "✧"],
            ["ten-units", "Ten units completed", "Complete ten study units.", "◈"],
            ["five-hundred-xp", "500 XP earned", "Earn 500 XP through study.", "★"]
        ];

        container.innerHTML = `
            <div class="achievements-grid">
                ${items.map(([id, title, description, icon]) => {
                    const award = state.achievements.find(item => item.id === id);

                    return `
                        <article class="achievement-card ${award ? "is-unlocked" : "is-locked"}">
                            <div class="achievement-icon" aria-hidden="true">${icon}</div>
                            <h3>${escapeHTML(title)}</h3>
                            <p>${escapeHTML(description)}</p>
                            <span class="achievement-status status-badge">
                                ${award ? `Unlocked ${readableShortDate(award.date)}` : "Not unlocked yet"}
                            </span>
                        </article>
                    `;
                }).join("")}
            </div>
        `;
    }

    function checkAchievements() {
        const completed = allUnits().filter(unit => unit.status === "completed").length;
        const rules = [
            ["first-task", "First study task", "Complete a timetable study task.",
                state.activities.some(item => item.type === "task")],
            ["first-unit", "First unit completed", "Complete your first study unit.", completed >= 1],
            ["first-course", "Course finisher", "Complete all units in a course.",
                state.courses.some(course =>
                    course.modules.flatMap(module => module.units).length > 0 &&
                    courseProgress(course) === 100
                )],
            ["two-day-streak", "Building a rhythm", "Study on two consecutive days.", longestStreak() >= 2],
            ["seven-day-streak", "Seven days of consistency", "Study on seven consecutive days.", longestStreak() >= 7],
            ["ten-units", "Ten units completed", "Complete ten study units.", completed >= 10],
            ["five-hundred-xp", "500 XP earned", "Earn 500 XP through study.", totalXP() >= 500]
        ];

        rules.forEach(([id, title, description, earned]) => {
            if (earned && !state.achievements.some(item => item.id === id)) {
                state.achievements.push({ id, title, description, date: dayKey() });
            }
        });
    }

    /* -------------------- Modal, backup and other controls -------------------- */

    function openModal(title, content, options = {}) {
        const backdrop = document.createElement("div");
        backdrop.className = "modal-backdrop";
        backdrop.innerHTML = `
            <section class="modal" role="dialog" aria-modal="true" aria-label="${escapeHTML(title)}">
                <h2>${escapeHTML(title)}</h2>
                ${content}
            </section>
        `;

        if (options.required) backdrop.dataset.required = "true";
        document.body.appendChild(backdrop);

        backdrop.querySelectorAll("[data-close-modal]").forEach(button => {
            button.addEventListener("click", () => {
                if (!backdrop.dataset.required) backdrop.remove();
            });
        });

        backdrop.addEventListener("click", event => {
            if (event.target === backdrop && !backdrop.dataset.required) backdrop.remove();
        });

        backdrop.addEventListener("keydown", event => {
            if (event.key === "Escape" && !backdrop.dataset.required) backdrop.remove();
        });

        return backdrop;
    }

    function exportData() {
        const blob = new Blob([JSON.stringify(state, null, 2)], {
            type: "application/json"
        });

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `academic-tracker-${dayKey()}.json`;
        link.click();
        URL.revokeObjectURL(url);
        toast("Backup downloaded.");
    }

    function importData(file) {
        if (!file) return;

        const reader = new FileReader();

        reader.onload = () => {
            try {
                const imported = JSON.parse(String(reader.result || ""));

                if (!Array.isArray(imported.courses) || !Array.isArray(imported.activities)) {
                    throw new Error("Invalid backup");
                }

                if (!confirm("Import this backup and replace the data saved in this browser?")) {
                    return;
                }

                state = {
                    ...blankState(),
                    ...imported,
                    settings: {
                        ...blankState().settings,
                        ...(imported.settings || {})
                    }
                };

                saveState();
                renderAll();
                toast("Backup restored.");
            } catch {
                toast("That file is not a valid Academic Tracker backup.");
            }
        };

        reader.readAsText(file);
    }

    function bindActions() {
        document.getElementById("add-course-button")
            ?.addEventListener("click", () => editCourse());

        document.getElementById("join-group-button")
            ?.addEventListener("click", () => goToPage("study-group"));

        document.addEventListener("click", event => {
            const action = event.target.closest("[data-action]")?.dataset.action;

            if (action === "edit-profile") profileEditor();
            if (action === "export-data") exportData();
        });

        document.addEventListener("change", event => {
            if (event.target.id === "import-data-file") {
                importData(event.target.files?.[0]);
                event.target.value = "";
            }
        });

        document.getElementById("notification-button")
            ?.addEventListener("click", () => {
                const remaining = state.tasks.filter(task =>
                    task.date === dayKey() && !task.completed
                ).length;

                toast(remaining
                    ? `${remaining} task${remaining === 1 ? "" : "s"} remain today.`
                    : "No unchecked tasks today.");
            });
    }

    /* -------------------- Home page and app startup -------------------- */

    function renderLiveDate() {
        const welcome = document.querySelector(".welcome-section");
        if (!welcome) return;

        let date = document.getElementById("live-date");

        if (!date) {
            date = document.createElement("p");
            date.id = "live-date";
            date.className = "section-eyebrow";
            date.style.marginTop = "12px";
            welcome.querySelector("div")?.appendChild(date);
        }

        date.textContent = readableDate();
    }

    function renderHome() {
        renderProfileSummary();
        renderLiveDate();
        renderStreakCard();
        renderStats();
        renderTodayTasks();
        renderRecentActivity();
        renderGroupPreview();
    }

    function renderAll() {
        applyAppearance();
        renderHome();

        if (currentPage === "courses") renderCourses();
        if (currentPage === "progress") renderProgress();
        if (currentPage === "study-group") renderStudyGroup();
        if (currentPage === "achievements") renderAchievements();
        if (currentPage === "settings") renderProfileSettings();
    }

    function start() {
        applyAppearance();
        bindNavigation();
        bindAppearance();
        bindActions();
        bindProfileSummary();

        if (!state.profile) {
            profileEditor(true);
        } else {
            addDefaultCoursesIfNeeded(state.profile);
            updateTodayTasks();
        }

        checkAchievements();
        saveState();
        renderAll();
        goToPage(currentPage);

        /* Refresh today's date and checklist while the app remains open. */
        setInterval(() => {
            updateTodayTasks();
            renderLiveDate();
            renderStreakCard();
            renderStats();
            renderTodayTasks();
        }, 60 * 1000);
    }

    start();
})();
