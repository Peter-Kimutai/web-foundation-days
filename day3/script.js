let notes = [
    { id: 1, text: "Buy milk and bread", category: "personal" },
    { id: 2, text: "Finish the Day 3 assignment", category: "study" },
    { id: 3, text: "Email the project report to Grace", category: "work" },
    { id: 4, text: "Revise JavaScript arrays", category: "study" },
    { id: 5, text: "Call mum", category: "personal" },
];


// 1. Search notes
function searchNotes(word) {
    return notes.filter(note =>
        note.text.toLowerCase().includes(word.toLowerCase())
    );
}


// 2. Find the longest note
function longestNote() {
    if (notes.length === 0) {
        return null;
    }

    let longest = notes[0];

    for (let note of notes) {
        if (note.text.length > longest.text.length) {
            longest = note;
        }
    }

    return longest;
}


// 3. Count notes by category
function countByCategory() {
    let counts = {};

    for (let note of notes) {
        if (!counts[note.category]) {
            counts[note.category] = 0;
        }

        counts[note.category]++;
    }

    return counts;
}


// 4. Get summary
function getSummary() {
    const counts = countByCategory();
    const total = notes.length;

    const noteWord = total === 1 ? "note" : "notes";

    return `${total} ${noteWord}: ${counts.personal || 0} personal, ${counts.work || 0} work, ${counts.study || 0} study.`;
}


// 5. Check for duplicate notes
function isDuplicate(text) {
    const normalizedText = text.trim().toLowerCase();

    return notes.some(note =>
        note.text.trim().toLowerCase() === normalizedText
    );
}


// 6. Add a new note
function addNote(text, category) {
    if (text.length < 1 || text.length > 200) {
        console.log("Note not added: text must be between 1 and 200 characters.");
        return false;
    }

    if (isDuplicate(text)) {
        console.log("Note not added: duplicate note.");
        return false;
    }

    if (!["personal", "work", "study"].includes(category)) {
        console.log("Note not added: invalid category.");
        return false;
    }

    const newNote = {
        id: notes.length + 1,
        text: text,
        category: category
    };

    notes.push(newNote);

    console.log("Note added successfully.");
    return true;
}


// TESTS

// searchNotes
console.log(searchNotes("javascript"));
// Expected: [{ id: 4, text: "Revise JavaScript arrays", category: "study" }]

console.log(searchNotes("football"));
// Expected: []


// longestNote
console.log(longestNote());
// Expected: { id: 3, text: "Email the project report to Grace", category: "work" }

console.log(longestNote().text.length);
// Expected: 33


// countByCategory
console.log(countByCategory());
// Expected: { personal: 2, study: 2, work: 1 }

notes = [];

console.log(countByCategory());
// Expected: {}


// Restore starting notes for remaining tests
notes = [
    { id: 1, text: "Buy milk and bread", category: "personal" },
    { id: 2, text: "Finish the Day 3 assignment", category: "study" },
    { id: 3, text: "Email the project report to Grace", category: "work" },
    { id: 4, text: "Revise JavaScript arrays", category: "study" },
    { id: 5, text: "Call mum", category: "personal" },
];


// getSummary
console.log(getSummary());
// Expected: "5 notes: 2 personal, 1 work, 2 study."

notes = [
    { id: 1, text: "Only one note", category: "personal" }
];

console.log(getSummary());
// Expected: "1 note: 1 personal, 0 work, 0 study."


// Restore starting notes
notes = [
    { id: 1, text: "Buy milk and bread", category: "personal" },
    { id: 2, text: "Finish the Day 3 assignment", category: "study" },
    { id: 3, text: "Email the project report to Grace", category: "work" },
    { id: 4, text: "Revise JavaScript arrays", category: "study" },
    { id: 5, text: "Call mum", category: "personal" },
];


// isDuplicate
console.log(isDuplicate("buy milk and bread"));
// Expected: true

console.log(isDuplicate("   Buy milk and bread   "));
// Expected: true

console.log(isDuplicate("Go to the gym"));
// Expected: false


// addNote
console.log(addNote("Read JavaScript documentation", "study"));
// Expected: true

console.log(addNote("Buy Milk And Bread", "personal"));
// Expected: false because it is a duplicate

console.log(addNote("New note", "invalid"));
// Expected: false because the category is invalid