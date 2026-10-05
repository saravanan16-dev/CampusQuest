/**
 * Student Profile Controller
 */

document.addEventListener("DOMContentLoaded", async () => {
    if (!Auth.requireAuth()) return;

    await loadProfileData();

    document.getElementById("edit-profile-form").addEventListener("submit", handleProfileUpdate);
});

async function loadProfileData() {
    try {
        const [profileRes, progressRes] = await Promise.all([
            API.getProfile(),
            API.getProgress()
        ]);

        if (profileRes.success) {
            const user = profileRes.data.user;
            const gamification = profileRes.data.gamification;

            document.getElementById("profile-name").innerText = user.name;
            document.getElementById("profile-username").innerText = `@${user.username}`;
            document.getElementById("profile-role").innerText = user.role;
            document.getElementById("profile-avatar").innerText = user.name.charAt(0).toUpperCase();

            document.getElementById("profile-streak-pill").innerHTML = `🔥 ${gamification.current_streak} Day Streak`;
            document.getElementById("profile-level-pill").innerHTML = `⚡ Level ${gamification.level} (${gamification.level_title})`;
            document.getElementById("profile-xp").innerText = `${gamification.total_xp} XP`;
            document.getElementById("profile-created").innerText = new Date(user.created_at).toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric"
            });

            // Fill form inputs
            document.getElementById("edit-name").value = user.name;
            document.getElementById("edit-email").value = user.email;
            document.getElementById("edit-username").value = user.username;
        }

        if (progressRes.success) {
            const stats = progressRes.data.stats;
            document.getElementById("ms-attempted").innerText = stats.questions_attempted;
            document.getElementById("ms-accuracy").innerText = `${stats.overall_accuracy}%`;
            document.getElementById("ms-tests").innerText = stats.tests_completed;
        }
    } catch (e) {
        console.error("Error loading profile data:", e);
    }
}

async function handleProfileUpdate(e) {
    e.preventDefault();

    const name = document.getElementById("edit-name").value.trim();
    const email = document.getElementById("edit-email").value.trim();
    const alertBox = document.getElementById("profile-alert");
    const saveBtn = document.getElementById("save-profile-btn");

    alertBox.className = "alert d-none py-2 small";
    saveBtn.disabled = true;
    saveBtn.innerText = "Saving changes...";

    try {
        const res = await API.updateProfile({ name, email });
        if (res.success) {
            alertBox.className = "alert alert-success py-2 small";
            alertBox.innerText = "Profile details updated successfully!";
            alertBox.classList.remove("d-none");

            // Update user in local storage and header
            const currentUser = API.getUser();
            if (currentUser) {
                currentUser.name = name;
                currentUser.email = email;
                API.setUser(currentUser);
                Auth.initNavbar();
            }

            document.getElementById("profile-name").innerText = name;
            document.getElementById("profile-avatar").innerText = name.charAt(0).toUpperCase();
        } else {
            alertBox.className = "alert alert-danger py-2 small";
            alertBox.innerText = res.message || "Failed to update profile";
            alertBox.classList.remove("d-none");
        }
    } catch (err) {
        alertBox.className = "alert alert-danger py-2 small";
        alertBox.innerText = err.message || "Failed to save profile changes";
        alertBox.classList.remove("d-none");
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerText = "Save Changes";
    }
}
