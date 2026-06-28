const B = require('./build_notes.js');
const {
  H1, H2, H3, P, bullet, numbered, mixed, calloutBox, codeBlock, spacer, divider, styledTable,
  Document, Packer, Paragraph, TextRun, Header, Footer, AlignmentType, LevelFormat, HeadingLevel,
  BorderStyle, WidthType, ShadingType, PageNumber, PageBreak, TableOfContents, fs,
  NAVY, TEAL, AMBER, CRIMSON, GREEN, LIGHT_TEAL_BG, LIGHT_AMBER_BG, LIGHT_CRIMSON_BG, LIGHT_GREEN_BG, FULL_W
} = B;

const children = [];

// ===================== TITLE PAGE =====================
children.push(
  spacer(1200),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: "🪟 SLIDING WINDOW", bold: true, size: 64, color: NAVY })]
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 300 },
    children: [new TextRun({ text: "Pattern", bold: true, size: 64, color: TEAL })]
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 600 },
    children: [new TextRun({ text: "Complete DSA Notes — Concept, Identification Flowchart, Worked Example & C++ Code", italics: true, size: 26, color: "555555" })]
  }),
  divider(AMBER),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 80 },
    children: [new TextRun({ text: "DSA Pattern Series — Pattern #2", bold: true, size: 24, color: NAVY })]
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 80 },
    children: [new TextRun({ text: "Prerequisite: Two Pointer Pattern", size: 22, color: "555555" })]
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: "Compiled from video transcript + added explanations, tables & code", size: 20, italics: true, color: "777777" })]
  }),
  new Paragraph({ children: [new PageBreak()] })
);

// ===================== TABLE OF CONTENTS =====================
children.push(
  H1("Table of Contents"),
  new TableOfContents("Table of Contents", { hyperlink: true, headingStyleRange: "1-2" }),
  new Paragraph({ children: [new PageBreak()] })
);

// ===================== SECTION 1: WHAT IS SLIDING WINDOW =====================
children.push(H1("1. What Is the Sliding Window Pattern?"));

children.push(P("Break the name into two parts and the whole pattern becomes obvious:"));

children.push(
  bullet([new TextRun({ text: "Window ", bold: true, color: TEAL }), new TextRun("→ a contiguous chunk/range of an array or string that you are currently \"looking at\".")]),
  bullet([new TextRun({ text: "Sliding ", bold: true, color: TEAL }), new TextRun("→ this window can grow bigger (expand) or shrink smaller on its own, and it moves forward as you process the array.")])
);

children.push(spacer(80));
children.push(H3("📌 Simple Analogy"));
children.push(P("Think of looking through a physical window frame as you walk along a wall. At any moment you only see a small portion of the wall (the \"window\"). As you walk forward, the frame slides — and depending on how you adjust it, the frame can get wider (expand) or narrower (shrink). Sliding Window in DSA works exactly the same way over an array."));

children.push(spacer(60));
children.push(H3("🔗 Built on Top of Two Pointers"));
children.push(P("Sliding Window is NOT a brand-new idea — it is Two Pointers with an extra layer of logic on top. That is exactly why Two Pointers is taught first."));

children.push(
  bullet([new TextRun({text: "Two boundary variables are used: "}), new TextRun({text: "low", bold:true, color: NAVY}), new TextRun(" (left edge) and "), new TextRun({text:"high", bold:true, color: NAVY}), new TextRun(" (right edge).")]),
  bullet("Both pointers move in the SAME direction (left to right) — never backward."),
  bullet([new TextRun("Moving "), new TextRun({text:"high++", font:"Consolas", color: GREEN}), new TextRun(" while keeping low fixed → window "), new TextRun({text:"EXPANDS", bold:true, color: GREEN}), new TextRun(" (grows on the right side).")]),
  bullet([new TextRun("Moving "), new TextRun({text:"low++", font:"Consolas", color: CRIMSON}), new TextRun(" while keeping high fixed → window "), new TextRun({text:"SHRINKS", bold:true, color: CRIMSON}), new TextRun(" (cuts off from the left side).")])
);

children.push(spacer(60));
children.push(calloutBox(
  "💡 Key Insight",
  ["The window only ever grows from the right end and only ever shrinks from the left end.",
   "That one rule is what makes the technique efficient — you never have to look at the whole window again from scratch."],
  LIGHT_TEAL_BG, TEAL, TEAL
));

children.push(new Paragraph({ children: [new PageBreak()] }));

// ===================== SECTION 2: WHERE DOES IT APPLY =====================
children.push(H1("2. Where Does Sliding Window Apply? (Checkpoint #1)"));
children.push(P("Before even thinking about Sliding Window, ask: \"Is this question on an Array or a String?\""));

children.push(
  bullet([new TextRun({text:"✅ Works on: ", bold:true, color: GREEN}), new TextRun("Arrays and Strings (a string is just an array of characters, so it counts).")]),
  bullet([new TextRun({text:"❌ Does NOT work on: ", bold:true, color: CRIMSON}), new TextRun("Linked Lists — in 99.9% of cases. Tattoo this rule in your memory.")])
);

children.push(spacer(80));
children.push(H3("📌 Checkpoint #2 — Contiguous, Not Random"));
children.push(P("The second filter: the question must be about a SUBARRAY (for arrays) or SUBSTRING (for strings) — meaning the elements must be CONTIGUOUS (next to each other, no skipping). It must NOT be a subsequence problem."));

children.push(styledTable(
  ["Term", "Contiguous?", "Meaning", "Example from [1, 0, 3, 5]"],
  [
    ["Subarray", "✅ Yes", "Continuous block of an array", "[0, 3, 5] is valid, [1, 3, 5] is NOT"],
    ["Substring", "✅ Yes", "Continuous block of a string", "\"abc\" of \"abcd\" is valid, \"ac\" is NOT"],
    ["Subsequence", "❌ No", "Any elements, order preserved, gaps allowed", "[1, 3] or [1, 5] are both valid"],
  ],
  [2200, 1500, 3400, 2260]
));

children.push(spacer(80));
children.push(calloutBox(
  "⚠️ Common Confusion",
  ["A LOT of people see \"subsequence\" in a question and still try to force Sliding Window onto it.",
   "Rule of thumb: Subarray / Substring = contiguous = Sliding Window is allowed.",
   "Subsequence = non-contiguous = Sliding Window does NOT apply — look at DP / recursion instead."],
  LIGHT_CRIMSON_BG, CRIMSON, CRIMSON
));

children.push(new Paragraph({ children: [new PageBreak()] }));

// ===================== SECTION 3: FLOWCHART / KEYWORDS =====================
children.push(H1("3. The Identification Flowchart (3-Question Test)"));
children.push(P("Once a question passes Checkpoint #1 and #2 above, run it through one final filter — what is the question actually asking you to find?"));

children.push(H3("🔑 Keyword Checklist", AMBER));
children.push(P("If the question uses ANY of these words, Sliding Window is almost certainly the right pattern:"));

children.push(styledTable(
  ["Category", "Keywords to look for"],
  [
    ["Optimization", "Maximum, Minimum, Longest, Shortest"],
    ["Aggregation", "Sum, Count, Average"],
    ["Constraint-based", "At Most K, At Least K, Exactly K"],
  ],
  [3000, 6360]
));

children.push(spacer(100));
children.push(H3("🧭 The Full 3-Step Flowchart", NAVY));

children.push(
  numbered([new TextRun({text:"Is it an Array or String question? ", bold:true}), new TextRun("→ If NO, stop. Sliding Window does not apply.")]),
  numbered([new TextRun({text:"Does it involve a Subarray / Substring (contiguous)? ", bold:true}), new TextRun("→ If NO (it's a subsequence), stop.")]),
  numbered([new TextRun({text:"Does it ask for Max / Min / Longest / Shortest / Sum / Count / Average / At Most K / At Least K / Exactly K? ", bold:true}), new TextRun("→ If YES, use Sliding Window!")])
);

children.push(spacer(80));
children.push(calloutBox(
  "✅ Golden Rule",
  ["Array or String + Subarray or Substring (contiguous) + one of the keywords above",
   "= Sliding Window, every single time."],
  LIGHT_GREEN_BG, GREEN, GREEN
));

children.push(new Paragraph({ children: [new PageBreak()] }));

// ===================== SECTION 4: TWO TYPES =====================
children.push(H1("4. Two Flavors of Sliding Window"));
children.push(P("Sliding Window comes in two forms, and picking the right one depends on a single clue in the question: does it give you a fixed length/size?"));

children.push(H3("1️⃣ Fixed-Size Window", TEAL));
children.push(bullet("Used when the problem explicitly gives you a window length (e.g. \"subarray of size K\", \"window of length 3\")."));
children.push(bullet("The window size NEVER changes — both low and high move forward together, one step at a time."));

children.push(spacer(60));
children.push(H3("2️⃣ Dynamic-Size Window", AMBER));
children.push(bullet("Used when NO fixed length is given — the window size is not known in advance."));
children.push(bullet("The window expands (high++) and shrinks (low++) independently based on a condition, growing and shrinking as needed."));
children.push(bullet("This is the more advanced variant — it gets its own dedicated patterns/videos, but the core engine is the same low/high logic explained above."));

children.push(spacer(80));
children.push(calloutBox(
  "📝 Quick Test",
  ["Question gives you a size/length number (like K = 3)? → Fixed Window.",
   "Question does NOT give a size, and instead asks for the \"longest\" / \"smallest\" valid window? → Dynamic Window."],
  LIGHT_AMBER_BG, AMBER, AMBER
));

children.push(new Paragraph({ children: [new PageBreak()] }));

// ===================== SECTION 5: THE CORE TRICK =====================
children.push(H1("5. How a Fixed Window Slides — The Core Trick"));
children.push(P("This is the single most important idea in the entire pattern — and the reason Sliding Window beats brute force."));

children.push(H3("❌ The Naive (Brute Force) Way", CRIMSON));
children.push(P("For every new window position, re-add up every single element inside it from scratch."));
children.push(P("This costs O(K) work per window, and there are about O(N) windows → O(N × K) total. Slow."));

children.push(spacer(60));
children.push(H3("✅ The Sliding Window Way", GREEN));
children.push(P("Don't recompute. REUSE the previous window's answer and just adjust for what changed:"));

children.push(codeBlock([
  "new_window_sum = old_window_sum",
  "                 - arr[low]      // the element that just LEFT the window",
  "                 + arr[high]     // the element that just ENTERED the window"
], "The One Formula to Remember"));

children.push(spacer(80));
children.push(P("Because only ONE element leaves and ONE element enters every time the window slides by one step, each slide costs just O(1) instead of O(K). Across the whole array that brings total time down from O(N × K) to O(N)."));

children.push(new Paragraph({ children: [new PageBreak()] }));

// ===================== SECTION 6: WORKED EXAMPLE =====================
children.push(H1("6. Worked Example — Maximum Sum Subarray of Size K"));

children.push(calloutBox(
  "🎯 Problem Statement",
  ["Given an array, find the maximum sum among all contiguous subarrays of a fixed size K.",
   "Array: [1, 0, 3, 5, 2, 1, 4]      K = 3"],
  LIGHT_TEAL_BG, TEAL, NAVY
));

children.push(spacer(80));
children.push(H2("6.1 Brute Force Approach"));
children.push(P("Generate every possible subarray of size K, sum each one individually, and track the maximum."));

children.push(codeBlock([
  "#include <bits/stdc++.h>",
  "using namespace std;",
  "",
  "int maxSumBruteForce(vector<int>& arr, int k) {",
  "    int n = arr.size();",
  "    int maxSum = INT_MIN;",
  "",
  "    // Try every starting index of a window of size k",
  "    for (int i = 0; i <= n - k; i++) {",
  "        int currentSum = 0;",
  "        for (int j = i; j < i + k; j++) {   // re-sum every time",
  "            currentSum += arr[j];",
  "        }",
  "        maxSum = max(maxSum, currentSum);",
  "    }",
  "    return maxSum;",
  "}"
], "C++ — Brute Force  |  Time: O(N x K)  |  Space: O(1)"));

children.push(spacer(60));
children.push(calloutBox(
  "⚠️ Why This Is Slow",
  ["The inner loop re-adds elements that were already added in the previous window.",
   "Example: window [1,0,3] and window [0,3,5] both re-add 0 and 3 — that work is wasted."],
  LIGHT_CRIMSON_BG, CRIMSON, CRIMSON
));

children.push(new Paragraph({ children: [new PageBreak()] }));

// ===================== SECTION 6.2 STEP-BY-STEP VISUALIZATION =====================
children.push(H2("6.2 Sliding Window Walkthrough (Step-by-Step)"));
children.push(P("Array: [1, 0, 3, 5, 2, 1, 4]  with indices  0, 1, 2, 3, 4, 5, 6.   K = 3."));
children.push(P("Step 1 — build the FIRST window normally (this is the only window we sum the slow way):"));

children.push(codeBlock([
  "Window 1 = arr[0..2] = [1, 0, 3]",
  "sum = 1 + 0 + 3 = 4"
]));

children.push(spacer(60));
children.push(P("From here on, every next window REUSES the previous sum:"));

children.push(styledTable(
  ["Win#", "Elements", "Element Leaving (-)", "Element Entering (+)", "Calculation", "Sum"],
  [
    ["1", "[1, 0, 3]", "—", "—", "1 + 0 + 3", "4"],
    ["2", "[0, 3, 5]", "1", "5", "4 − 1 + 5", "8"],
    ["3", "[3, 5, 2]", "0", "2", "8 − 0 + 2", "10"],
    ["4", "[5, 2, 1]", "3", "1", "10 − 3 + 1", "8"],
    ["5", "[2, 1, 4]", "5", "4", "8 − 5 + 4", "7"],
  ],
  [780, 1900, 1750, 1750, 1980, 1200]
));

children.push(spacer(80));
children.push(calloutBox(
  "🏁 Result",
  ["Sums obtained: 4, 8, 10, 8, 7",
   "Maximum Sum = 10   (from window [3, 5, 2])"],
  LIGHT_GREEN_BG, GREEN, GREEN
));

children.push(new Paragraph({ children: [new PageBreak()] }));

// ===================== SECTION 6.3 OPTIMIZED CODE =====================
children.push(H2("6.3 Optimized Sliding Window Approach"));

children.push(codeBlock([
  "#include <bits/stdc++.h>",
  "using namespace std;",
  "",
  "int maxSumSlidingWindow(vector<int>& arr, int k) {",
  "    int n = arr.size();",
  "    if (n < k) return -1;          // edge case: not enough elements",
  "",
  "    int windowSum = 0;",
  "    // Step 1: build the very first window (indices 0 to k-1)",
  "    for (int i = 0; i < k; i++) {",
  "        windowSum += arr[i];",
  "    }",
  "",
  "    int maxSum = windowSum;",
  "",
  "    // Step 2: slide the window across the rest of the array",
  "    for (int high = k; high < n; high++) {",
  "        int low = high - k;          // index of the element leaving",
  "        windowSum += arr[high];       // add the new element entering",
  "        windowSum -= arr[low];        // remove the old element leaving",
  "        maxSum = max(maxSum, windowSum);",
  "    }",
  "",
  "    return maxSum;",
  "}",
  "",
  "int main() {",
  "    vector<int> arr = {1, 0, 3, 5, 2, 1, 4};",
  "    int k = 3;",
  "    cout << \"Maximum sum of subarray of size \" << k",
  "         << \" = \" << maxSumSlidingWindow(arr, k) << endl;",
  "    return 0;",
  "}"
], "C++ — Optimized Sliding Window  |  Time: O(N)  |  Space: O(1)"));

children.push(spacer(80));
children.push(P("Output:"));
children.push(codeBlock(["Maximum sum of subarray of size 3 = 10"]));

children.push(new Paragraph({ children: [new PageBreak()] }));

// ===================== SECTION 7: FIXED VS DYNAMIC TABLE =====================
children.push(H1("7. Fixed Window vs Dynamic Window — Side by Side"));

children.push(styledTable(
  ["Aspect", "Fixed-Size Window", "Dynamic-Size Window"],
  [
    ["Window size", "Given in the question (e.g. K = 3)", "Not given — changes as we go"],
    ["low movement", "Moves every step, together with high", "Moves only when a condition is broken"],
    ["high movement", "Moves every step, together with low", "Moves every step (always expands first)"],
    ["When to use", "Question explicitly states a length/size", "Question asks for longest / shortest / smallest valid window"],
    ["Typical asks", "\"Subarray of size K\"", "\"Longest substring with...\", \"Smallest subarray with sum ≥ X\""],
    ["Example problems", "Max sum subarray of size K, first negative in window K", "Longest substring without repeating characters, min window substring"],
    ["Time complexity", "O(N)", "O(N) (amortized — each pointer moves at most N times)"],
  ],
  [1900, 3700, 3760]
));

children.push(new Paragraph({ children: [new PageBreak()] }));

// ===================== SECTION 8: COMMON MISTAKES =====================
children.push(H1("8. Common Mistakes & Pro Tips"));

children.push(H3("🚫 Mistakes to Avoid", CRIMSON));
children.push(
  bullet([new TextRun({text:"Forcing it on subsequence problems: ", bold:true}), new TextRun("if order can skip elements, it's NOT Sliding Window territory.")]),
  bullet([new TextRun({text:"Forcing it on Linked Lists: ", bold:true}), new TextRun("Sliding Window needs O(1) random access (arr[i]) to add/remove elements at both ends instantly — linked lists don't give you that.")]),
  bullet([new TextRun({text:"Moving only one pointer in a fixed window: ", bold:true}), new TextRun("for a FIXED size window, low and high must move together, every step. Moving only high changes the window size, which breaks the \"fixed\" assumption.")]),
  bullet([new TextRun({text:"Re-summing every window: ", bold:true}), new TextRun("if you find yourself looping through the whole window again at every step, you have accidentally fallen back to brute force — go back to the subtract-old/add-new trick.")]),
  bullet([new TextRun({text:"Ignoring the n < k edge case: ", bold:true}), new TextRun("always check if the array is even big enough to hold one window of size K before starting.")])
);

children.push(spacer(80));
children.push(H3("💡 Pro Tips", GREEN));
children.push(
  bullet("Before coding, physically draw the array on paper, mark low and high with arrows, and dry-run 2-3 slides by hand."),
  bullet("Whenever you see \"contiguous\", \"subarray\", or \"substring\" in a problem statement, your brain should immediately whisper \"Sliding Window?\"."),
  bullet([new TextRun("A neat trick for "), new TextRun({text:"\"exactly K\"", italics:true}), new TextRun(" distinct-element problems: "), new TextRun({text:"exactly(K) = atMost(K) − atMost(K − 1)", font:"Consolas", bold:true, color: NAVY}), new TextRun(". Solve the easier \"at most\" version twice instead of the harder \"exactly\" version once.")]),
  bullet("Always state out loud which type you're using — fixed or dynamic — before writing a single line of code. It decides your whole loop structure.")
);

children.push(new Paragraph({ children: [new PageBreak()] }));

// ===================== SECTION 9: COMPLEXITY CHEAT SHEET =====================
children.push(H1("9. Complexity Cheat-Sheet"));

children.push(styledTable(
  ["Approach", "Time Complexity", "Space Complexity", "Notes"],
  [
    ["Brute Force (any window problem)", "O(N x K)", "O(1)", "Re-sums every window from scratch"],
    ["Sliding Window — Fixed Size", "O(N)", "O(1)", "Each element added once, removed once"],
    ["Sliding Window — Dynamic Size", "O(N)", "O(1) or O(K) for a hashmap/set", "Amortized: low + high each move ≤ N times total"],
  ],
  [3300, 2000, 1900, 2160]
));

children.push(new Paragraph({ children: [new PageBreak()] }));

// ===================== SECTION 10: PRACTICE PROBLEMS =====================
children.push(H1("10. Practice Problems (Build Muscle Memory)"));

children.push(H3("🟦 Fixed-Size Window", TEAL));
children.push(
  numbered("Maximum / Minimum sum of a subarray of size K"),
  numbered("First negative number in every window of size K"),
  numbered("Maximum of all subarrays of size K (sliding window maximum — deque-based)"),
  numbered("Count occurrences of anagrams of a pattern in a string"),
  numbered("Average of all contiguous subarrays of size K")
);

children.push(spacer(80));
children.push(H3("🟧 Dynamic-Size Window (preview — covered in the next pattern videos)", AMBER));
children.push(
  numbered("Longest substring without repeating characters"),
  numbered("Smallest subarray with a sum greater than or equal to a target"),
  numbered("Longest subarray with sum less than or equal to K"),
  numbered("Minimum window substring"),
  numbered("Longest substring with at most K distinct characters")
);

children.push(new Paragraph({ children: [new PageBreak()] }));

// ===================== SECTION 11: INTERVIEW Q&A =====================
children.push(H1("11. Interview Q&A"));

function qa(q, a) {
  children.push(
    mixed([{text: "Q: ", bold: true, color: NAVY}, {text: q, bold: true}]),
    mixed([{text: "A: ", bold: true, color: TEAL}, {text: a}])
  );
  children.push(spacer(100));
}

qa(
  "What is the relationship between Two Pointers and Sliding Window?",
  "Sliding Window is built directly on top of Two Pointers. Two Pointers gives you two boundary indices moving through a structure; Sliding Window adds the specific rule that those two pointers define a contiguous \"window\" that can expand (move high) or shrink (move low), used to track a running aggregate like a sum or count."
);
qa(
  "Why doesn't Sliding Window work on Linked Lists?",
  "Sliding Window's efficiency comes from O(1) access to arr[low] and arr[high] to instantly add or remove an element from either end of the window. Linked lists don't support O(1) random access — finding a specific index requires walking from the head, which would defeat the purpose of the optimization."
);
qa(
  "What's the difference between a subarray and a subsequence?",
  "A subarray (or substring, for strings) must be contiguous — no skipping elements. A subsequence preserves relative order but can skip elements freely. Sliding Window only ever applies to subarray/substring problems, never to subsequence problems."
);
qa(
  "How do you decide between a fixed-size and a dynamic-size window?",
  "Check if the problem statement hands you an explicit length (like \"size K\" or \"window of length 3\"). If yes, use a fixed window where both pointers move together. If the problem instead asks for the longest/shortest/smallest valid window without giving a size, use a dynamic window where the pointers move independently based on a condition."
);
qa(
  "What time complexity improvement does Sliding Window give for the fixed-size subarray sum problem?",
  "Brute force recomputes every window's sum from scratch: O(K) work for each of roughly N windows, giving O(N x K) overall. Sliding Window reuses the previous window's sum and only adjusts by the one element leaving and the one element entering, giving O(1) work per slide and O(N) overall."
);
qa(
  "Walk through how the window sum is updated when the window slides by one position.",
  "newSum = oldSum - arr[low] + arr[high], where arr[low] is the element that just exited the window on the left and arr[high] is the new element that just entered on the right. After updating the sum, both low and high are incremented (for a fixed-size window) to move the window one step forward."
);
qa(
  "Can Sliding Window be used for \"exactly K distinct elements\" type problems?",
  "Yes, indirectly. \"Exactly K\" is awkward to track directly, but it can be expressed as exactly(K) = atMost(K) - atMost(K - 1). Solve the simpler \"at most K\" version (a standard dynamic window problem) twice with different K values and subtract."
);
qa(
  "What is the space complexity of the Sliding Window technique?",
  "For simple sum/count tracking, O(1) extra space, since you only maintain a couple of running variables (sum, low, high). If the window needs to track frequency of elements (e.g. distinct character counts), it becomes O(K) or O(alphabet size) for the hashmap/array used to store frequencies."
);

children.push(new Paragraph({ children: [new PageBreak()] }));

// ===================== SECTION 12: QUICK REVISION =====================
children.push(H1("12. One-Page Quick Revision"));

children.push(calloutBox(
  "🪟 Sliding Window — Cheat Sheet",
  [
    "1. Applies to: Array or String only (never Linked List).",
    "2. Must be: Subarray / Substring (contiguous) — never Subsequence.",
    "3. Keywords: Max, Min, Longest, Shortest, Sum, Count, Average, At Most K, At Least K, Exactly K.",
    "4. Two types: FIXED size (size given, both pointers move together) vs DYNAMIC size (size not given, pointers move independently).",
    "5. Core trick: newSum = oldSum - arr[low] + arr[high]  →  O(1) per slide instead of O(K).",
    "6. Total complexity: O(N x K) brute force  →  O(N) sliding window."
  ],
  LIGHT_TEAL_BG, NAVY, NAVY
));

children.push(spacer(120));
children.push(P("Next up: Dynamic-Size Sliding Window — where low and high move independently, and each problem has its own \"shrink condition\". Practice the fixed-window problems above first to build the base reflex before moving on.", { italics: true, color: "555555" }));

// ===================== BUILD DOCUMENT =====================
const doc = new Document({
  styles: {
    default: { document: { run: { font: "Arial", size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 36, bold: true, font: "Arial", color: NAVY },
        paragraph: { spacing: { before: 280, after: 220 }, outlineLevel: 0,
          border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: NAVY, space: 4 } } } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, font: "Arial", color: TEAL },
        paragraph: { spacing: { before: 200, after: 160 }, outlineLevel: 1 } },
    ]
  },
  numbering: {
    config: [
      { reference: "bullets",
        levels: [
          { level: 0, format: LevelFormat.BULLET, text: "●", alignment: AlignmentType.LEFT,
            style: { run: { color: TEAL }, paragraph: { indent: { left: 560, hanging: 280 } } } },
          { level: 1, format: LevelFormat.BULLET, text: "○", alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 980, hanging: 280 } } } },
        ] },
      { reference: "numbers",
        levels: [
          { level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
            style: { run: { bold: true, color: NAVY }, paragraph: { indent: { left: 560, hanging: 280 } } } },
        ] },
    ]
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 }
      }
    },
    headers: {
      default: new Header({ children: [new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [new TextRun({ text: "DSA Patterns — Sliding Window", size: 18, color: "999999", italics: true })]
      })] })
    },
    footers: {
      default: new Footer({ children: [new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "Page ", size: 18, color: "999999" }), new TextRun({ children: [PageNumber.CURRENT], size: 18, color: "999999" })]
      })] })
    },
    children
  }]
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync("/home/claude/Sliding_Window_Pattern_Notes.docx", buffer);
  console.log("done");
});