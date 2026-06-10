// CodeRank per-question harness registry.
//
// Single source of truth mapping every question slug to an explicit harness
// PROFILE. A profile encodes the question's true LeetCode *execution kind* —
// not just its parameter/return types — so the generator (lib/coderank/harness.js)
// and the validator (scripts/coderank/validate_harnesses.mjs) both know exactly
// how to wrap the user's snippet and how to judge the result.
//
// Why this exists: the old path picked parsing/printing purely from
// function_metadata.{params,return}.type. That silently mis-handled every
// question whose execution model differs from "call a function, print its
// return value" — void/in-place mutation, Codec round-trips, graph cloning,
// random-pointer copies, and object-design (operation-array) problems. Those
// passed the type-only validator while producing nonsense at runtime
// (e.g. serialize-and-deserialize-binary-tree generated `Solution().Codec(...)`).
//
// Profile shape:
//   {
//     kind: 'return_value' | 'in_place_mutation' | 'object_design'
//         | 'codec_round_trip_tree' | 'clone_graph' | 'copy_random_list'
//         | 'round_trip_strings',
//     name?: string,                 // method to call (return_value / in_place)
//     params?: [{ name, type }],     // canonical types — see harness.js TYPES
//     returnType?: string,           // 'void' for in_place_mutation
//     mutates?: string,              // param name printed back (in_place_mutation)
//     className?, ctor?, methods?,   // object_design
//     judge: { mode, checker? },     // drives lib/coderank/judge
//   }
//
// Canonical types (see harness.js): boolean, int, float, string, int[],
// string[], int[][], string[][], ListNode, ListNode[], TreeNode.

export const HARNESS_KINDS = new Set([
  'return_value',
  'in_place_mutation',
  'object_design',
  'codec_round_trip_tree',
  'clone_graph',
  'copy_random_list',
  'round_trip_strings',
  'linked_list_cycle',
]);

export const HARNESS_REGISTRY = {
  // ── return_value ──────────────────────────────────────────────────────────
  // Parse params, call the method, serialize and print the return value.
  "3sum": { kind: 'return_value', name: "threeSum", params: [{ name: "nums", type: "int[]" }], returnType: "int[][]", judge: { mode: 'unordered_triplets' } },
  "add-two-numbers": { kind: 'return_value', name: "addTwoNumbers", params: [{ name: "l1", type: "ListNode" }, { name: "l2", type: "ListNode" }], returnType: "ListNode", judge: { mode: 'linked_list_exact' } },
  "alien-dictionary": { kind: 'return_value', name: "alienOrder", params: [{ name: "words", type: "string[]" }], returnType: "string", judge: { mode: 'custom', checker: 'alien_dictionary' } },
  "balanced-binary-tree": { kind: 'return_value', name: "isBalanced", params: [{ name: "root", type: "TreeNode" }], returnType: "boolean", judge: { mode: 'exact' } },
  "best-time-to-buy-and-sell-stock": { kind: 'return_value', name: "maxProfit", params: [{ name: "prices", type: "int[]" }], returnType: "int", judge: { mode: 'exact' } },
  "best-time-to-buy-and-sell-stock-with-cooldown": { kind: 'return_value', name: "maxProfit", params: [{ name: "prices", type: "int[]" }], returnType: "int", judge: { mode: 'exact' } },
  "binary-search": { kind: 'return_value', name: "search", params: [{ name: "nums", type: "int[]" }, { name: "target", type: "int" }], returnType: "int", judge: { mode: 'exact' } },
  "binary-tree-level-order-traversal": { kind: 'return_value', name: "levelOrder", params: [{ name: "root", type: "TreeNode" }], returnType: "int[][]", judge: { mode: 'exact' } },
  "binary-tree-maximum-path-sum": { kind: 'return_value', name: "maxPathSum", params: [{ name: "root", type: "TreeNode" }], returnType: "int", judge: { mode: 'exact' } },
  "binary-tree-right-side-view": { kind: 'return_value', name: "rightSideView", params: [{ name: "root", type: "TreeNode" }], returnType: "int[]", judge: { mode: 'exact' } },
  "burst-balloons": { kind: 'return_value', name: "maxCoins", params: [{ name: "nums", type: "int[]" }], returnType: "int", judge: { mode: 'exact' } },
  "car-fleet": { kind: 'return_value', name: "carFleet", params: [{ name: "target", type: "int" }, { name: "position", type: "int[]" }, { name: "speed", type: "int[]" }], returnType: "int", judge: { mode: 'exact' } },
  "cheapest-flights-within-k-stops": { kind: 'return_value', name: "findCheapestPrice", params: [{ name: "n", type: "int" }, { name: "flights", type: "int[][]" }, { name: "src", type: "int" }, { name: "dst", type: "int" }, { name: "k", type: "int" }], returnType: "int", judge: { mode: 'exact' } },
  "climbing-stairs": { kind: 'return_value', name: "climbStairs", params: [{ name: "n", type: "int" }], returnType: "int", judge: { mode: 'exact' } },
  "coin-change": { kind: 'return_value', name: "coinChange", params: [{ name: "coins", type: "int[]" }, { name: "amount", type: "int" }], returnType: "int", judge: { mode: 'exact' } },
  "coin-change-ii": { kind: 'return_value', name: "change", params: [{ name: "amount", type: "int" }, { name: "coins", type: "int[]" }], returnType: "int", judge: { mode: 'exact' } },
  "combination-sum": { kind: 'return_value', name: "combinationSum", params: [{ name: "candidates", type: "int[]" }, { name: "target", type: "int" }], returnType: "int[][]", judge: { mode: 'unordered_nested_array' } },
  "combination-sum-ii": { kind: 'return_value', name: "combinationSum2", params: [{ name: "candidates", type: "int[]" }, { name: "target", type: "int" }], returnType: "int[][]", judge: { mode: 'exact' } },
  "construct-binary-tree-from-preorder-and-inorder-traversal": { kind: 'return_value', name: "buildTree", params: [{ name: "preorder", type: "int[]" }, { name: "inorder", type: "int[]" }], returnType: "TreeNode", judge: { mode: 'tree_level_order_exact' } },
  "container-with-most-water": { kind: 'return_value', name: "maxArea", params: [{ name: "height", type: "int[]" }], returnType: "int", judge: { mode: 'exact' } },
  "contains-duplicate": { kind: 'return_value', name: "containsDuplicate", params: [{ name: "nums", type: "int[]" }], returnType: "boolean", judge: { mode: 'exact' } },
  "count-good-nodes-in-binary-tree": { kind: 'return_value', name: "goodNodes", params: [{ name: "root", type: "TreeNode" }], returnType: "int", judge: { mode: 'exact' } },
  "counting-bits": { kind: 'return_value', name: "countBits", params: [{ name: "n", type: "int" }], returnType: "int[]", judge: { mode: 'exact' } },
  "course-schedule": { kind: 'return_value', name: "canFinish", params: [{ name: "numCourses", type: "int" }, { name: "prerequisites", type: "int[][]" }], returnType: "boolean", judge: { mode: 'exact' } },
  "course-schedule-ii": { kind: 'return_value', name: "findOrder", params: [{ name: "numCourses", type: "int" }, { name: "prerequisites", type: "int[][]" }], returnType: "int[]", judge: { mode: 'custom', checker: 'course_schedule_ii' } },
  "daily-temperatures": { kind: 'return_value', name: "dailyTemperatures", params: [{ name: "temperatures", type: "int[]" }], returnType: "int[]", judge: { mode: 'exact' } },
  "decode-ways": { kind: 'return_value', name: "numDecodings", params: [{ name: "s", type: "string" }], returnType: "int", judge: { mode: 'exact' } },
  "diameter-of-binary-tree": { kind: 'return_value', name: "diameterOfBinaryTree", params: [{ name: "root", type: "TreeNode" }], returnType: "int", judge: { mode: 'exact' } },
  "distinct-subsequences": { kind: 'return_value', name: "numDistinct", params: [{ name: "s", type: "string" }, { name: "t", type: "string" }], returnType: "int", judge: { mode: 'exact' } },
  "edit-distance": { kind: 'return_value', name: "minDistance", params: [{ name: "word1", type: "string" }, { name: "word2", type: "string" }], returnType: "int", judge: { mode: 'exact' } },
  "evaluate-reverse-polish-notation": { kind: 'return_value', name: "evalRPN", params: [{ name: "tokens", type: "string[]" }], returnType: "int", judge: { mode: 'exact' } },
  "find-minimum-in-rotated-sorted-array": { kind: 'return_value', name: "findMin", params: [{ name: "nums", type: "int[]" }], returnType: "int", judge: { mode: 'exact' } },
  "find-the-duplicate-number": { kind: 'return_value', name: "findDuplicate", params: [{ name: "nums", type: "int[]" }], returnType: "int", judge: { mode: 'exact' } },
  "gas-station": { kind: 'return_value', name: "canCompleteCircuit", params: [{ name: "gas", type: "int[]" }, { name: "cost", type: "int[]" }], returnType: "int", judge: { mode: 'exact' } },
  "generate-parentheses": { kind: 'return_value', name: "generateParenthesis", params: [{ name: "n", type: "int" }], returnType: "string[]", judge: { mode: 'exact' } },
  "graph-valid-tree": { kind: 'return_value', name: "validTree", params: [{ name: "n", type: "int" }, { name: "edges", type: "int[][]" }], returnType: "boolean", judge: { mode: 'exact' } },
  "group-anagrams": { kind: 'return_value', name: "groupAnagrams", params: [{ name: "strs", type: "string[]" }], returnType: "string[][]", judge: { mode: 'unordered_nested_array' } },
  "hand-of-straights": { kind: 'return_value', name: "isNStraightHand", params: [{ name: "hand", type: "int[]" }, { name: "groupSize", type: "int" }], returnType: "boolean", judge: { mode: 'exact' } },
  "happy-number": { kind: 'return_value', name: "isHappy", params: [{ name: "n", type: "int" }], returnType: "boolean", judge: { mode: 'exact' } },
  "house-robber": { kind: 'return_value', name: "rob", params: [{ name: "nums", type: "int[]" }], returnType: "int", judge: { mode: 'exact' } },
  "house-robber-ii": { kind: 'return_value', name: "rob", params: [{ name: "nums", type: "int[]" }], returnType: "int", judge: { mode: 'exact' } },
  "insert-interval": { kind: 'return_value', name: "insert", params: [{ name: "intervals", type: "int[][]" }, { name: "newInterval", type: "int[]" }], returnType: "int[][]", judge: { mode: 'exact' } },
  "interleaving-string": { kind: 'return_value', name: "isInterleave", params: [{ name: "s1", type: "string" }, { name: "s2", type: "string" }, { name: "s3", type: "string" }], returnType: "boolean", judge: { mode: 'exact' } },
  "invert-binary-tree": { kind: 'return_value', name: "invertTree", params: [{ name: "root", type: "TreeNode" }], returnType: "TreeNode", judge: { mode: 'tree_level_order_exact' } },
  "jump-game": { kind: 'return_value', name: "canJump", params: [{ name: "nums", type: "int[]" }], returnType: "boolean", judge: { mode: 'exact' } },
  "jump-game-ii": { kind: 'return_value', name: "jump", params: [{ name: "nums", type: "int[]" }], returnType: "int", judge: { mode: 'exact' } },
  "k-closest-points-to-origin": { kind: 'return_value', name: "kClosest", params: [{ name: "points", type: "int[][]" }, { name: "k", type: "int" }], returnType: "int[][]", judge: { mode: 'unordered_nested_array' } },
  "koko-eating-bananas": { kind: 'return_value', name: "minEatingSpeed", params: [{ name: "piles", type: "int[]" }, { name: "h", type: "int" }], returnType: "int", judge: { mode: 'exact' } },
  "kth-largest-element-in-an-array": { kind: 'return_value', name: "findKthLargest", params: [{ name: "nums", type: "int[]" }, { name: "k", type: "int" }], returnType: "int", judge: { mode: 'exact' } },
  "kth-smallest-element-in-a-bst": { kind: 'return_value', name: "kthSmallest", params: [{ name: "root", type: "TreeNode" }, { name: "k", type: "int" }], returnType: "int", judge: { mode: 'exact' } },
  "largest-rectangle-in-histogram": { kind: 'return_value', name: "largestRectangleArea", params: [{ name: "heights", type: "int[]" }], returnType: "int", judge: { mode: 'exact' } },
  "last-stone-weight": { kind: 'return_value', name: "lastStoneWeight", params: [{ name: "stones", type: "int[]" }], returnType: "int", judge: { mode: 'exact' } },
  "letter-combinations-of-a-phone-number": { kind: 'return_value', name: "letterCombinations", params: [{ name: "digits", type: "string" }], returnType: "string[]", judge: { mode: 'unordered_array' } },
  "linked-list-cycle": { kind: 'linked_list_cycle', name: "hasCycle", params: [{ name: "head", type: "ListNode" }, { name: "pos", type: "int" }], returnType: "boolean", judge: { mode: 'exact' } },
  "longest-common-subsequence": { kind: 'return_value', name: "longestCommonSubsequence", params: [{ name: "text1", type: "string" }, { name: "text2", type: "string" }], returnType: "int", judge: { mode: 'exact' } },
  "longest-consecutive-sequence": { kind: 'return_value', name: "longestConsecutive", params: [{ name: "nums", type: "int[]" }], returnType: "int", judge: { mode: 'exact' } },
  "longest-increasing-path-in-a-matrix": { kind: 'return_value', name: "longestIncreasingPath", params: [{ name: "matrix", type: "int[][]" }], returnType: "int", judge: { mode: 'exact' } },
  "longest-increasing-subsequence": { kind: 'return_value', name: "lengthOfLIS", params: [{ name: "nums", type: "int[]" }], returnType: "int", judge: { mode: 'exact' } },
  "longest-palindromic-substring": { kind: 'return_value', name: "longestPalindrome", params: [{ name: "s", type: "string" }], returnType: "string", judge: { mode: 'exact' } },
  "longest-repeating-character-replacement": { kind: 'return_value', name: "characterReplacement", params: [{ name: "s", type: "string" }, { name: "k", type: "int" }], returnType: "int", judge: { mode: 'exact' } },
  "longest-substring-without-repeating-characters": { kind: 'return_value', name: "lengthOfLongestSubstring", params: [{ name: "s", type: "string" }], returnType: "int", judge: { mode: 'exact' } },
  "lowest-common-ancestor-of-a-binary-search-tree": { kind: 'return_value', name: "lowestCommonAncestor", params: [{ name: "root", type: "TreeNode" }, { name: "p", type: "int" }, { name: "q", type: "int" }], returnType: "TreeNode", judge: { mode: 'tree_level_order_exact' } },
  "max-area-of-island": { kind: 'return_value', name: "maxAreaOfIsland", params: [{ name: "grid", type: "int[][]" }], returnType: "int", judge: { mode: 'exact' } },
  "maximum-depth-of-binary-tree": { kind: 'return_value', name: "maxDepth", params: [{ name: "root", type: "TreeNode" }], returnType: "int", judge: { mode: 'exact' } },
  "maximum-product-subarray": { kind: 'return_value', name: "maxProduct", params: [{ name: "nums", type: "int[]" }], returnType: "int", judge: { mode: 'exact' } },
  "maximum-subarray": { kind: 'return_value', name: "maxSubArray", params: [{ name: "nums", type: "int[]" }], returnType: "int", judge: { mode: 'exact' } },
  "median-of-two-sorted-arrays": { kind: 'return_value', name: "findMedianSortedArrays", params: [{ name: "nums1", type: "int[]" }, { name: "nums2", type: "int[]" }], returnType: "float", judge: { mode: 'float_approx' } },
  "meeting-rooms": { kind: 'return_value', name: "canAttendMeetings", params: [{ name: "intervals", type: "int[][]" }], returnType: "boolean", judge: { mode: 'exact' } },
  "meeting-rooms-ii": { kind: 'return_value', name: "minMeetingRooms", params: [{ name: "intervals", type: "int[][]" }], returnType: "int", judge: { mode: 'exact' } },
  "merge-intervals": { kind: 'return_value', name: "merge", params: [{ name: "intervals", type: "int[][]" }], returnType: "int[][]", judge: { mode: 'unordered_intervals' } },
  "merge-k-sorted-lists": { kind: 'return_value', name: "mergeKLists", params: [{ name: "lists", type: "ListNode[]" }], returnType: "ListNode", judge: { mode: 'linked_list_exact' } },
  "merge-triplets-to-form-target-triplet": { kind: 'return_value', name: "mergeTriplets", params: [{ name: "triplets", type: "int[][]" }, { name: "target", type: "int[]" }], returnType: "boolean", judge: { mode: 'exact' } },
  "merge-two-sorted-lists": { kind: 'return_value', name: "mergeTwoLists", params: [{ name: "list1", type: "ListNode" }, { name: "list2", type: "ListNode" }], returnType: "ListNode", judge: { mode: 'linked_list_exact' } },
  "min-cost-climbing-stairs": { kind: 'return_value', name: "minCostClimbingStairs", params: [{ name: "cost", type: "int[]" }], returnType: "int", judge: { mode: 'exact' } },
  "min-cost-to-connect-all-points": { kind: 'return_value', name: "minCostConnectPoints", params: [{ name: "points", type: "int[][]" }], returnType: "int", judge: { mode: 'exact' } },
  "minimum-interval-to-include-each-query": { kind: 'return_value', name: "minInterval", params: [{ name: "intervals", type: "int[][]" }, { name: "queries", type: "int[]" }], returnType: "int[]", judge: { mode: 'exact' } },
  "minimum-window-substring": { kind: 'return_value', name: "minWindow", params: [{ name: "s", type: "string" }, { name: "t", type: "string" }], returnType: "string", judge: { mode: 'exact' } },
  "missing-number": { kind: 'return_value', name: "missingNumber", params: [{ name: "nums", type: "int[]" }], returnType: "int", judge: { mode: 'exact' } },
  "multiply-strings": { kind: 'return_value', name: "multiply", params: [{ name: "num1", type: "string" }, { name: "num2", type: "string" }], returnType: "string", judge: { mode: 'exact' } },
  "n-queens": { kind: 'return_value', name: "solveNQueens", params: [{ name: "n", type: "int" }], returnType: "string[][]", judge: { mode: 'unordered_nested_array' } },
  "network-delay-time": { kind: 'return_value', name: "networkDelayTime", params: [{ name: "times", type: "int[][]" }, { name: "n", type: "int" }, { name: "k", type: "int" }], returnType: "int", judge: { mode: 'exact' } },
  "non-overlapping-intervals": { kind: 'return_value', name: "eraseOverlapIntervals", params: [{ name: "intervals", type: "int[][]" }], returnType: "int", judge: { mode: 'exact' } },
  "number-of-1-bits": { kind: 'return_value', name: "hammingWeight", params: [{ name: "n", type: "int" }], returnType: "int", judge: { mode: 'exact' } },
  "number-of-connected-components-in-an-undirected-graph": { kind: 'return_value', name: "countComponents", params: [{ name: "n", type: "int" }, { name: "edges", type: "int[][]" }], returnType: "int", judge: { mode: 'exact' } },
  "number-of-islands": { kind: 'return_value', name: "numIslands", params: [{ name: "grid", type: "string[][]" }], returnType: "int", judge: { mode: 'exact' } },
  "pacific-atlantic-water-flow": { kind: 'return_value', name: "pacificAtlantic", params: [{ name: "heights", type: "int[][]" }], returnType: "int[][]", judge: { mode: 'exact' } },
  "palindrome-partitioning": { kind: 'return_value', name: "partition", params: [{ name: "s", type: "string" }], returnType: "string[][]", judge: { mode: 'exact' } },
  "palindromic-substrings": { kind: 'return_value', name: "countSubstrings", params: [{ name: "s", type: "string" }], returnType: "int", judge: { mode: 'exact' } },
  "partition-equal-subset-sum": { kind: 'return_value', name: "canPartition", params: [{ name: "nums", type: "int[]" }], returnType: "boolean", judge: { mode: 'exact' } },
  "partition-labels": { kind: 'return_value', name: "partitionLabels", params: [{ name: "s", type: "string" }], returnType: "int[]", judge: { mode: 'exact' } },
  "permutation-in-string": { kind: 'return_value', name: "checkInclusion", params: [{ name: "s1", type: "string" }, { name: "s2", type: "string" }], returnType: "boolean", judge: { mode: 'exact' } },
  "permutations": { kind: 'return_value', name: "permute", params: [{ name: "nums", type: "int[]" }], returnType: "int[][]", judge: { mode: 'unordered_outer' } },
  "plus-one": { kind: 'return_value', name: "plusOne", params: [{ name: "digits", type: "int[]" }], returnType: "int[]", judge: { mode: 'exact' } },
  "powx-n": { kind: 'return_value', name: "myPow", params: [{ name: "x", type: "float" }, { name: "n", type: "int" }], returnType: "float", judge: { mode: 'float_approx' } },
  "product-of-array-except-self": { kind: 'return_value', name: "productExceptSelf", params: [{ name: "nums", type: "int[]" }], returnType: "int[]", judge: { mode: 'exact' } },
  "reconstruct-itinerary": { kind: 'return_value', name: "findItinerary", params: [{ name: "tickets", type: "string[][]" }], returnType: "string[]", judge: { mode: 'exact' } },
  "redundant-connection": { kind: 'return_value', name: "findRedundantConnection", params: [{ name: "edges", type: "int[][]" }], returnType: "int[]", judge: { mode: 'exact' } },
  "regular-expression-matching": { kind: 'return_value', name: "isMatch", params: [{ name: "s", type: "string" }, { name: "p", type: "string" }], returnType: "boolean", judge: { mode: 'exact' } },
  "remove-nth-node-from-end-of-list": { kind: 'return_value', name: "removeNthFromEnd", params: [{ name: "head", type: "ListNode" }, { name: "n", type: "int" }], returnType: "ListNode", judge: { mode: 'linked_list_exact' } },
  "reverse-bits": { kind: 'return_value', name: "reverseBits", params: [{ name: "n", type: "int" }], returnType: "int", judge: { mode: 'exact' } },
  "reverse-integer": { kind: 'return_value', name: "reverse", params: [{ name: "x", type: "int" }], returnType: "int", judge: { mode: 'exact' } },
  "reverse-linked-list": { kind: 'return_value', name: "reverseList", params: [{ name: "head", type: "ListNode" }], returnType: "ListNode", judge: { mode: 'linked_list_exact' } },
  "reverse-nodes-in-k-group": { kind: 'return_value', name: "reverseKGroup", params: [{ name: "head", type: "ListNode" }, { name: "k", type: "int" }], returnType: "ListNode", judge: { mode: 'linked_list_exact' } },
  "rotting-oranges": { kind: 'return_value', name: "orangesRotting", params: [{ name: "grid", type: "int[][]" }], returnType: "int", judge: { mode: 'exact' } },
  "same-tree": { kind: 'return_value', name: "isSameTree", params: [{ name: "p", type: "TreeNode" }, { name: "q", type: "TreeNode" }], returnType: "boolean", judge: { mode: 'exact' } },
  "search-a-2d-matrix": { kind: 'return_value', name: "searchMatrix", params: [{ name: "matrix", type: "int[][]" }, { name: "target", type: "int" }], returnType: "boolean", judge: { mode: 'exact' } },
  "search-in-rotated-sorted-array": { kind: 'return_value', name: "search", params: [{ name: "nums", type: "int[]" }, { name: "target", type: "int" }], returnType: "int", judge: { mode: 'exact' } },
  "single-number": { kind: 'return_value', name: "singleNumber", params: [{ name: "nums", type: "int[]" }], returnType: "int", judge: { mode: 'exact' } },
  "sliding-window-maximum": { kind: 'return_value', name: "maxSlidingWindow", params: [{ name: "nums", type: "int[]" }, { name: "k", type: "int" }], returnType: "int[]", judge: { mode: 'exact' } },
  "spiral-matrix": { kind: 'return_value', name: "spiralOrder", params: [{ name: "matrix", type: "int[][]" }], returnType: "int[]", judge: { mode: 'exact' } },
  "subsets": { kind: 'return_value', name: "subsets", params: [{ name: "nums", type: "int[]" }], returnType: "int[][]", judge: { mode: 'unordered_nested_array' } },
  "subsets-ii": { kind: 'return_value', name: "subsetsWithDup", params: [{ name: "nums", type: "int[]" }], returnType: "int[][]", judge: { mode: 'unordered_nested_array' } },
  "subtree-of-another-tree": { kind: 'return_value', name: "isSubtree", params: [{ name: "root", type: "TreeNode" }, { name: "subRoot", type: "TreeNode" }], returnType: "boolean", judge: { mode: 'exact' } },
  "sum-of-two-integers": { kind: 'return_value', name: "getSum", params: [{ name: "a", type: "int" }, { name: "b", type: "int" }], returnType: "int", judge: { mode: 'exact' } },
  "swim-in-rising-water": { kind: 'return_value', name: "swimInWater", params: [{ name: "grid", type: "int[][]" }], returnType: "int", judge: { mode: 'exact' } },
  "target-sum": { kind: 'return_value', name: "findTargetSumWays", params: [{ name: "nums", type: "int[]" }, { name: "target", type: "int" }], returnType: "int", judge: { mode: 'exact' } },
  "task-scheduler": { kind: 'return_value', name: "leastInterval", params: [{ name: "tasks", type: "string[]" }, { name: "n", type: "int" }], returnType: "int", judge: { mode: 'exact' } },
  "top-k-frequent-elements": { kind: 'return_value', name: "topKFrequent", params: [{ name: "nums", type: "int[]" }, { name: "k", type: "int" }], returnType: "int[]", judge: { mode: 'unordered_array' } },
  "trapping-rain-water": { kind: 'return_value', name: "trap", params: [{ name: "height", type: "int[]" }], returnType: "int", judge: { mode: 'exact' } },
  "two-sum": { kind: 'return_value', name: "twoSum", params: [{ name: "nums", type: "int[]" }, { name: "target", type: "int" }], returnType: "int[]", judge: { mode: 'unordered_array' } },
  "two-sum-ii-input-array-is-sorted": { kind: 'return_value', name: "twoSum", params: [{ name: "numbers", type: "int[]" }, { name: "target", type: "int" }], returnType: "int[]", judge: { mode: 'exact' } },
  "unique-paths": { kind: 'return_value', name: "uniquePaths", params: [{ name: "m", type: "int" }, { name: "n", type: "int" }], returnType: "int", judge: { mode: 'exact' } },
  "valid-anagram": { kind: 'return_value', name: "isAnagram", params: [{ name: "s", type: "string" }, { name: "t", type: "string" }], returnType: "boolean", judge: { mode: 'exact' } },
  "valid-palindrome": { kind: 'return_value', name: "isPalindrome", params: [{ name: "s", type: "string" }], returnType: "boolean", judge: { mode: 'exact' } },
  "valid-parentheses": { kind: 'return_value', name: "isValid", params: [{ name: "s", type: "string" }], returnType: "boolean", judge: { mode: 'exact' } },
  "valid-parenthesis-string": { kind: 'return_value', name: "checkValidString", params: [{ name: "s", type: "string" }], returnType: "boolean", judge: { mode: 'exact' } },
  "valid-sudoku": { kind: 'return_value', name: "isValidSudoku", params: [{ name: "board", type: "string[][]" }], returnType: "boolean", judge: { mode: 'exact' } },
  "validate-binary-search-tree": { kind: 'return_value', name: "isValidBST", params: [{ name: "root", type: "TreeNode" }], returnType: "boolean", judge: { mode: 'exact' } },
  "word-break": { kind: 'return_value', name: "wordBreak", params: [{ name: "s", type: "string" }, { name: "wordDict", type: "string[]" }], returnType: "boolean", judge: { mode: 'exact' } },
  "word-ladder": { kind: 'return_value', name: "ladderLength", params: [{ name: "beginWord", type: "string" }, { name: "endWord", type: "string" }, { name: "wordList", type: "string[]" }], returnType: "int", judge: { mode: 'exact' } },
  "word-search": { kind: 'return_value', name: "exist", params: [{ name: "board", type: "string[][]" }, { name: "word", type: "string" }], returnType: "boolean", judge: { mode: 'exact' } },
  "word-search-ii": { kind: 'return_value', name: "findWords", params: [{ name: "board", type: "string[][]" }, { name: "words", type: "string[]" }], returnType: "string[]", judge: { mode: 'unordered_array' } },

  // ── in_place_mutation ───────────────────────────────────────────────────--
  // Void method that mutates an argument; the harness prints the MUTATED param,
  // never the (null) return value.
  "rotate-image": { kind: 'in_place_mutation', name: "rotate", params: [{ name: "matrix", type: "int[][]" }], returnType: "void", mutates: "matrix", judge: { mode: 'exact' } },
  "set-matrix-zeroes": { kind: 'in_place_mutation', name: "setZeroes", params: [{ name: "matrix", type: "int[][]" }], returnType: "void", mutates: "matrix", judge: { mode: 'exact' } },
  "surrounded-regions": { kind: 'in_place_mutation', name: "solve", params: [{ name: "board", type: "string[][]" }], returnType: "void", mutates: "board", judge: { mode: 'exact' } },
  "walls-and-gates": { kind: 'in_place_mutation', name: "wallsAndGates", params: [{ name: "rooms", type: "int[][]" }], returnType: "void", mutates: "rooms", judge: { mode: 'exact' } },
  "reorder-list": { kind: 'in_place_mutation', name: "reorderList", params: [{ name: "head", type: "ListNode" }], returnType: "void", mutates: "head", judge: { mode: 'linked_list_exact' } },

  // ── object_design (operation-array) ────────────────────────────────────--
  // stdin = {operations:[...], arguments:[[...],...]}; replay the class API and
  // emit one result per op (null for the constructor and void methods).
  "lru-cache": { kind: 'object_design', className: 'LRUCache', ctor: ['int'],
    methods: { get: { args: ['int'], returnType: 'int' }, put: { args: ['int', 'int'], returnType: 'void' } },
    judge: { mode: 'exact' } },
  "min-stack": { kind: 'object_design', className: 'MinStack', ctor: [],
    methods: { push: { args: ['int'], returnType: 'void' }, pop: { args: [], returnType: 'void' }, top: { args: [], returnType: 'int' }, getMin: { args: [], returnType: 'int' } },
    judge: { mode: 'exact' } },
  "implement-trie-prefix-tree": { kind: 'object_design', className: 'Trie', ctor: [],
    methods: { insert: { args: ['string'], returnType: 'void' }, search: { args: ['string'], returnType: 'boolean' }, startsWith: { args: ['string'], returnType: 'boolean' } },
    judge: { mode: 'exact' } },
  "design-add-and-search-words-data-structure": { kind: 'object_design', className: 'WordDictionary', ctor: [],
    methods: { addWord: { args: ['string'], returnType: 'void' }, search: { args: ['string'], returnType: 'boolean' } },
    judge: { mode: 'exact' } },
  "time-based-key-value-store": { kind: 'object_design', className: 'TimeMap', ctor: [],
    methods: { set: { args: ['string', 'string', 'int'], returnType: 'void' }, get: { args: ['string', 'int'], returnType: 'string' } },
    judge: { mode: 'exact' } },
  "kth-largest-element-in-a-stream": { kind: 'object_design', className: 'KthLargest', ctor: ['int', 'int[]'],
    methods: { add: { args: ['int'], returnType: 'int' } },
    judge: { mode: 'exact' } },
  "design-twitter": { kind: 'object_design', className: 'Twitter', ctor: [],
    methods: {
      postTweet: { args: ['int', 'int'], returnType: 'void' },
      getNewsFeed: { args: ['int'], returnType: 'intList' },
      follow: { args: ['int', 'int'], returnType: 'void' },
      unfollow: { args: ['int', 'int'], returnType: 'void' },
    },
    judge: { mode: 'exact' } },
  "find-median-from-data-stream": { kind: 'object_design', className: 'MedianFinder', ctor: [],
    methods: { addNum: { args: ['int'], returnType: 'void' }, findMedian: { args: [], returnType: 'float' } },
    judge: { mode: 'exact' } },
  "detect-squares": { kind: 'object_design', className: 'DetectSquares', ctor: [],
    methods: { add: { args: ['int[]'], returnType: 'void' }, count: { args: ['int[]'], returnType: 'int' } },
    judge: { mode: 'exact' } },

  // ── round_trip_strings ──────────────────────────────────────────────────--
  // encode(strs) -> decode(encoded); never compare the opaque encoded string.
  "encode-and-decode-strings": { kind: 'round_trip_strings', params: [{ name: "dummy_input", type: "string[]" }], returnType: "string[]", judge: { mode: 'exact' } },

  // ── codec_round_trip_tree ────────────────────────────────────────────────-
  // Codec().deserialize(Codec().serialize(root)); print the round-tripped tree
  // as a level-order array. Do NOT compare the raw serialized string.
  "serialize-and-deserialize-binary-tree": { kind: 'codec_round_trip_tree', className: 'Codec', params: [{ name: "root", type: "TreeNode" }], returnType: "TreeNode", judge: { mode: 'tree_level_order_exact' } },

  // ── clone_graph ───────────────────────────────────────────────────────────
  // Parse a 1-indexed adjacency list into Node graph, cloneGraph(node), then
  // BFS-serialize the CLONE back to a canonical adjacency list.
  "clone-graph": { kind: 'clone_graph', name: "cloneGraph", params: [{ name: "edges", type: "adjList" }], returnType: "adjList", judge: { mode: 'exact' } },

  // ── copy_random_list ─────────────────────────────────────────────────────-
  // Parse [[val,randomIdx],...] into a Node list with random pointers,
  // copyRandomList(head), serialize the copy back to the same representation.
  "copy-list-with-random-pointer": { kind: 'copy_random_list', name: "copyRandomList", params: [{ name: "head", type: "randomList" }], returnType: "randomList", judge: { mode: 'exact' } },
};

// Resolve the explicit profile for a slug, or null when none is registered.
export function getProfile(slug) {
  if (!slug) return null;
  return HARNESS_REGISTRY[slug] || null;
}

// Fallback for a question with no explicit registry entry: synthesize a plain
// return_value profile from its function_metadata so legacy callers keep
// working. The validator flags runtime questions that fall through to this.
export function deriveReturnValueProfile(functionMetadata) {
  const m = functionMetadata || {};
  if (!m.name) return null;
  const judge =
    m.judge && m.judge.mode
      ? { mode: m.judge.mode, checker: m.judge.checker || undefined }
      : m.orderInsensitive && (m.return?.type === 'int[][]' || m.return?.type === 'string[][]')
        ? { mode: 'unordered_nested_array' }
        : m.orderInsensitive && (m.return?.type === 'int[]' || m.return?.type === 'string[]')
          ? { mode: 'unordered_array' }
          : { mode: 'exact' };
  return {
    kind: 'return_value',
    name: String(m.name),
    params: Array.isArray(m.params) ? m.params.map((p) => ({ name: String(p.name), type: String(p.type) })) : [],
    returnType: m.return?.type || 'int[]',
    judge,
  };
}

export function listSlugs() {
  return Object.keys(HARNESS_REGISTRY);
}
