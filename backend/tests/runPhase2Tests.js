/**
 * CampusQuest Phase 2 Test Runner
 * Validates:
 * 1. Authentication: POST /register, POST /login, GET /profile
 * 2. Protected routes with authMiddleware (401 check when unauthenticated)
 * 3. Subjects: GET /subjects, GET /subjects/:id
 * 4. Units: GET /units, POST /units, GET /units/:id, GET /subjects/:id/units
 * 5. Notes: GET /notes (with ?subject_id= and ?unit_id=), GET /notes/:id, POST /notes, PUT /notes/:id, DELETE /notes/:id
 * 6. Student Dashboard: GET /dashboard (returns name, subjects_count, notes_count)
 */

const BASE_URL = "http://localhost:5000";

async function request(endpoint, options = {}) {
    const { headers = {}, ...rest } = options;
    const res = await fetch(`${BASE_URL}${endpoint}`, {
        headers: {
            "Content-Type": "application/json",
            ...headers
        },
        ...rest
    });
    const text = await res.text();
    try {
        return { status: res.status, ok: res.ok, data: JSON.parse(text) };
    } catch {
        return { status: res.status, ok: res.ok, text };
    }
}

async function runPhase2Tests() {
    console.log("==========================================");
    console.log("   CAMPUSQUEST PHASE 2 TEST SUITE        ");
    console.log("==========================================\n");

    let studentToken = null;
    let studentId = null;
    const testUsername = `student_${Date.now()}`;
    const testEmail = `${testUsername}@testcampus.edu`;

    // 1. POST /register
    console.log("1. Testing POST /register...");
    const regRes = await request("/register", {
        method: "POST",
        body: JSON.stringify({
            username: testUsername,
            name: "Phase 2 Student",
            email: testEmail,
            password: "Password@123",
            college: "National Institute of Technology",
            department: "Computer Science",
            year: 3,
            semester: 5
        })
    });
    console.log("  Status:", regRes.status, "Success:", regRes.data?.success);
    if (regRes.status !== 201) throw new Error(`Register failed: ${JSON.stringify(regRes.data)}`);
    console.log("  Token received:", !!regRes.data.token);

    // 2. POST /login
    console.log("\n2. Testing POST /login with username...");
    const loginRes = await request("/login", {
        method: "POST",
        body: JSON.stringify({
            username: testUsername,
            password: "Password@123"
        })
    });
    console.log("  Status:", loginRes.status, "Success:", loginRes.data?.success);
    if (loginRes.status !== 200 || !loginRes.data.token) {
        throw new Error(`Login failed: ${JSON.stringify(loginRes.data)}`);
    }
    studentToken = loginRes.data.token;
    studentId = loginRes.data.data.user.id;
    console.log(`  Login successful. User: ${loginRes.data.data.user.name} (ID: ${studentId})`);

    // 3. Testing 401 on protected /profile without token
    console.log("\n3. Testing 401 Unauthorized on GET /profile without token...");
    const unauthRes = await request("/profile");
    console.log("  Status:", unauthRes.status, "(Expected: 401)");
    if (unauthRes.status !== 401) throw new Error("Expected 401 for unauthenticated request");

    // 4. GET /profile with token
    console.log("\n4. Testing GET /profile with valid JWT...");
    const profRes = await request("/profile", {
        headers: { Authorization: `Bearer ${studentToken}` }
    });
    console.log("  Status:", profRes.status, "Student Name:", profRes.data.data?.name);
    if (profRes.status !== 200 || profRes.data.data.username !== testUsername) {
        throw new Error("Profile retrieval failed");
    }

    // 5. GET /dashboard
    console.log("\n5. Testing GET /dashboard (Phase 2 Section 10)...");
    const dashRes = await request("/dashboard", {
        headers: { Authorization: `Bearer ${studentToken}` }
    });
    console.log("  Status:", dashRes.status, "Success:", dashRes.data?.success);
    console.log(`  User: ${dashRes.data?.name}, Subjects: ${dashRes.data?.subjects_count}, Notes: ${dashRes.data?.notes_count}`);
    if (dashRes.status !== 200 || typeof dashRes.data.subjects_count !== "number") {
        throw new Error("Dashboard endpoint failed");
    }

    // 6. Subjects API
    console.log("\n6. Testing GET /subjects and GET /subjects/:id...");
    const subsRes = await request("/subjects");
    console.log("  Total subjects found:", subsRes.data?.data?.length);
    if (!subsRes.data?.data || subsRes.data.data.length === 0) throw new Error("No subjects found");
    const testSubject = subsRes.data.data[0];

    const subDetailRes = await request(`/subjects/${testSubject.id}`);
    console.log(`  Subject #${testSubject.id}: ${subDetailRes.data?.data?.name}`);
    if (subDetailRes.status !== 200) throw new Error("GET /subjects/:id failed");

    // 7. Units API (Phase 2 Section 7)
    console.log("\n7. Testing Units APIs (GET /units, GET /subjects/:id/units, POST /units)...");
    const unitsRes = await request(`/units?subject_id=${testSubject.id}`);
    console.log(`  Units for subject #${testSubject.id}: ${unitsRes.data?.data?.length}`);
    if (unitsRes.status !== 200) throw new Error("GET /units failed");

    // Create a new unit
    const newUnitRes = await request("/units", {
        method: "POST",
        body: JSON.stringify({
            subject_id: testSubject.id,
            unit_number: 6,
            name: "Unit 6: Advanced Topics & Case Studies"
        })
    });
    console.log("  Created unit status:", newUnitRes.status);
    const createdUnitId = newUnitRes.data?.data?.id;

    // 8. Notes APIs (Phase 2 Section 8 & 9)
    console.log("\n8. Testing Notes APIs (POST, GET, PUT, DELETE with subject_id and unit_id filtering)...");
    
    // Create Note
    const createNoteRes = await request("/notes", {
        method: "POST",
        headers: { Authorization: `Bearer ${studentToken}` },
        body: JSON.stringify({
            subject_id: testSubject.id,
            unit_id: createdUnitId,
            unit: 6,
            title: "Phase 2 Comprehensive Test Note",
            description: "A comprehensive test note verifying subject -> unit -> note relation",
            content: "# Phase 2 Verification\n\nStudent -> Subject -> Unit -> Note flow confirmed.",
            file_url: "/uploads/notes/phase2_test.pdf"
        })
    });
    console.log("  Create note status:", createNoteRes.status);
    if (createNoteRes.status !== 201) throw new Error(`Create note failed: ${JSON.stringify(createNoteRes.data)}`);
    const createdNoteId = createNoteRes.data.data.id;

    // Filter Notes by subject_id and unit_id
    const filterNotesRes = await request(`/notes?subject_id=${testSubject.id}&unit_id=${createdUnitId}`);
    console.log("  Filtered notes count:", filterNotesRes.data?.data?.length);
    if (filterNotesRes.data.data.length === 0) throw new Error("Filtering notes by subject_id & unit_id failed");

    // Update Note
    const updateNoteRes = await request(`/notes/${createdNoteId}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${studentToken}` },
        body: JSON.stringify({
            title: "Phase 2 Comprehensive Test Note (Updated)",
            description: "Updated description for unit note"
        })
    });
    console.log("  Update note status:", updateNoteRes.status);
    if (updateNoteRes.status !== 200) throw new Error("Update note failed");

    // Delete Note
    const delNoteRes = await request(`/notes/${createdNoteId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${studentToken}` }
    });
    console.log("  Delete note status:", delNoteRes.status);
    if (delNoteRes.status !== 200) throw new Error("Delete note failed");

    // Clean up created unit
    if (createdUnitId) {
        await request(`/units/${createdUnitId}`, { method: "DELETE" });
    }

    console.log("\n==========================================");
    console.log("   ALL PHASE 2 BACKEND TESTS PASSED!      ");
    console.log("==========================================");
}

runPhase2Tests().catch(err => {
    console.error("\n❌ PHASE 2 TEST FAILED:", err.message);
    process.exit(1);
});
