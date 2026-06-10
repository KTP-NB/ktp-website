// Bare starter snippets (what the Monaco editor shows) for questions that were
// previously stored as full baked harness programs. Under the registry-driven
// model the database stores ONLY the bare snippet — byte-similar to LeetCode's
// codeSnippets — and lib/coderank/harness.js wraps it at runtime from the
// question's profile (lib/coderank/harnessRegistry.js).
//
// scripts/coderank/seed_profiles.mjs writes these as cr_questions.starter_code
// while flipping use_runtime_harness=true. The 3 graph/codec/random specials
// already store correct bare snippets in the DB, so they are intentionally not
// listed here — only their function_metadata needs fixing.

export const BARE_SNIPPETS = {
  // ── in_place_mutation ─────────────────────────────────────────────────────
  'rotate-image': {
    python: `class Solution:
    def rotate(self, matrix: List[List[int]]) -> None:
        """Do not return anything, modify matrix in-place instead."""
        `,
    javascript: `/**
 * @param {number[][]} matrix
 * @return {void} Do not return anything, modify matrix in-place instead.
 */
var rotate = function(matrix) {

};`,
    java: `class Solution {
    public void rotate(int[][] matrix) {

    }
}`,
  },
  'set-matrix-zeroes': {
    python: `class Solution:
    def setZeroes(self, matrix: List[List[int]]) -> None:
        """Do not return anything, modify matrix in-place instead."""
        `,
    javascript: `/**
 * @param {number[][]} matrix
 * @return {void} Do not return anything, modify matrix in-place instead.
 */
var setZeroes = function(matrix) {

};`,
    java: `class Solution {
    public void setZeroes(int[][] matrix) {

    }
}`,
  },
  'surrounded-regions': {
    python: `class Solution:
    def solve(self, board: List[List[str]]) -> None:
        """Do not return anything, modify board in-place instead."""
        `,
    javascript: `/**
 * @param {character[][]} board
 * @return {void} Do not return anything, modify board in-place instead.
 */
var solve = function(board) {

};`,
    java: `class Solution {
    public void solve(char[][] board) {

    }
}`,
  },
  'walls-and-gates': {
    python: `class Solution:
    def wallsAndGates(self, rooms: List[List[int]]) -> None:
        """Do not return anything, modify rooms in-place instead."""
        `,
    javascript: `/**
 * @param {number[][]} rooms
 * @return {void} Do not return anything, modify rooms in-place instead.
 */
var wallsAndGates = function(rooms) {

};`,
    java: `class Solution {
    public void wallsAndGates(int[][] rooms) {

    }
}`,
  },
  'reorder-list': {
    python: `# Definition for singly-linked list.
# class ListNode:
#     def __init__(self, val=0, next=None):
#         self.val = val
#         self.next = next
class Solution:
    def reorderList(self, head: Optional[ListNode]) -> None:
        """Do not return anything, modify head in-place instead."""
        `,
    javascript: `/**
 * Definition for singly-linked list.
 * function ListNode(val, next) { this.val = (val===undefined ? 0 : val); this.next = (next===undefined ? null : next); }
 *
 * @param {ListNode} head
 * @return {void} Do not return anything, modify head in-place instead.
 */
var reorderList = function(head) {

};`,
    java: `/**
 * Definition for singly-linked list.
 * public class ListNode { int val; ListNode next; ListNode(int x) { val = x; } }
 */
class Solution {
    public void reorderList(ListNode head) {

    }
}`,
  },

  // ── object_design ─────────────────────────────────────────────────────────
  'min-stack': {
    python: `class MinStack:
    def __init__(self):
        pass

    def push(self, val: int) -> None:
        pass

    def pop(self) -> None:
        pass

    def top(self) -> int:
        pass

    def getMin(self) -> int:
        pass`,
    javascript: `class MinStack {
    constructor() {

    }
    /** @param {number} val */
    push(val) {

    }
    pop() {

    }
    /** @return {number} */
    top() {

    }
    /** @return {number} */
    getMin() {

    }
}`,
    java: `class MinStack {
    public MinStack() {

    }
    public void push(int val) {

    }
    public void pop() {

    }
    public int top() {
        return 0;
    }
    public int getMin() {
        return 0;
    }
}`,
  },
  'implement-trie-prefix-tree': {
    python: `class Trie:
    def __init__(self):
        pass

    def insert(self, word: str) -> None:
        pass

    def search(self, word: str) -> bool:
        pass

    def startsWith(self, prefix: str) -> bool:
        pass`,
    javascript: `class Trie {
    constructor() {

    }
    /** @param {string} word */
    insert(word) {

    }
    /** @param {string} word @return {boolean} */
    search(word) {

    }
    /** @param {string} prefix @return {boolean} */
    startsWith(prefix) {

    }
}`,
    java: `class Trie {
    public Trie() {

    }
    public void insert(String word) {

    }
    public boolean search(String word) {
        return false;
    }
    public boolean startsWith(String prefix) {
        return false;
    }
}`,
  },
  'design-add-and-search-words-data-structure': {
    python: `class WordDictionary:
    def __init__(self):
        pass

    def addWord(self, word: str) -> None:
        pass

    def search(self, word: str) -> bool:
        pass`,
    javascript: `class WordDictionary {
    constructor() {

    }
    /** @param {string} word */
    addWord(word) {

    }
    /** @param {string} word @return {boolean} */
    search(word) {

    }
}`,
    java: `class WordDictionary {
    public WordDictionary() {

    }
    public void addWord(String word) {

    }
    public boolean search(String word) {
        return false;
    }
}`,
  },
  'time-based-key-value-store': {
    python: `class TimeMap:
    def __init__(self):
        pass

    def set(self, key: str, value: str, timestamp: int) -> None:
        pass

    def get(self, key: str, timestamp: int) -> str:
        pass`,
    javascript: `class TimeMap {
    constructor() {

    }
    /** @param {string} key @param {string} value @param {number} timestamp */
    set(key, value, timestamp) {

    }
    /** @param {string} key @param {number} timestamp @return {string} */
    get(key, timestamp) {

    }
}`,
    java: `class TimeMap {
    public TimeMap() {

    }
    public void set(String key, String value, int timestamp) {

    }
    public String get(String key, int timestamp) {
        return "";
    }
}`,
  },
  'kth-largest-element-in-a-stream': {
    python: `class KthLargest:
    def __init__(self, k: int, nums: List[int]):
        pass

    def add(self, val: int) -> int:
        pass`,
    javascript: `class KthLargest {
    /** @param {number} k @param {number[]} nums */
    constructor(k, nums) {

    }
    /** @param {number} val @return {number} */
    add(val) {

    }
}`,
    java: `class KthLargest {
    public KthLargest(int k, int[] nums) {

    }
    public int add(int val) {
        return 0;
    }
}`,
  },
  'design-twitter': {
    python: `class Twitter:
    def __init__(self):
        pass

    def postTweet(self, userId: int, tweetId: int) -> None:
        pass

    def getNewsFeed(self, userId: int) -> List[int]:
        pass

    def follow(self, followerId: int, followeeId: int) -> None:
        pass

    def unfollow(self, followerId: int, followeeId: int) -> None:
        pass`,
    javascript: `class Twitter {
    constructor() {

    }
    /** @param {number} userId @param {number} tweetId */
    postTweet(userId, tweetId) {

    }
    /** @param {number} userId @return {number[]} */
    getNewsFeed(userId) {

    }
    /** @param {number} followerId @param {number} followeeId */
    follow(followerId, followeeId) {

    }
    /** @param {number} followerId @param {number} followeeId */
    unfollow(followerId, followeeId) {

    }
}`,
    java: `class Twitter {
    public Twitter() {

    }
    public void postTweet(int userId, int tweetId) {

    }
    public List<Integer> getNewsFeed(int userId) {
        return new ArrayList<>();
    }
    public void follow(int followerId, int followeeId) {

    }
    public void unfollow(int followerId, int followeeId) {

    }
}`,
  },
  'find-median-from-data-stream': {
    python: `class MedianFinder:
    def __init__(self):
        pass

    def addNum(self, num: int) -> None:
        pass

    def findMedian(self) -> float:
        pass`,
    javascript: `class MedianFinder {
    constructor() {

    }
    /** @param {number} num */
    addNum(num) {

    }
    /** @return {number} */
    findMedian() {

    }
}`,
    java: `class MedianFinder {
    public MedianFinder() {

    }
    public void addNum(int num) {

    }
    public double findMedian() {
        return 0.0;
    }
}`,
  },
  'detect-squares': {
    python: `class DetectSquares:
    def __init__(self):
        pass

    def add(self, point: List[int]) -> None:
        pass

    def count(self, point: List[int]) -> int:
        pass`,
    javascript: `class DetectSquares {
    constructor() {

    }
    /** @param {number[]} point */
    add(point) {

    }
    /** @param {number[]} point @return {number} */
    count(point) {

    }
}`,
    java: `class DetectSquares {
    public DetectSquares() {

    }
    public void add(int[] point) {

    }
    public int count(int[] point) {
        return 0;
    }
}`,
  },
  'lru-cache': {
    python: `class LRUCache:
    def __init__(self, capacity: int):
        pass

    def get(self, key: int) -> int:
        pass

    def put(self, key: int, value: int) -> None:
        pass`,
    javascript: `class LRUCache {
    /** @param {number} capacity */
    constructor(capacity) {

    }
    /** @param {number} key @return {number} */
    get(key) {

    }
    /** @param {number} key @param {number} value */
    put(key, value) {

    }
}`,
    java: `class LRUCache {
    public LRUCache(int capacity) {

    }
    public int get(int key) {
        return 0;
    }
    public void put(int key, int value) {

    }
}`,
  },

  // ── round_trip_strings ────────────────────────────────────────────────────
  'encode-and-decode-strings': {
    python: `def encode(strs: List[str]) -> str:
    pass

def decode(s: str) -> List[str]:
    pass`,
    javascript: `/**
 * @param {string[]} strs
 * @returns {string}
 */
var encode = function(strs) {

};

/**
 * @param {string} s
 * @returns {string[]}
 */
var decode = function(s) {

};`,
    java: `class Codec {
    public String encode(List<String> strs) {
        return "";
    }
    public List<String> decode(String s) {
        return new ArrayList<>();
    }
}`,
  },

  // ── return_value (previously baked function-customs) ──────────────────────
  'median-of-two-sorted-arrays': {
    python: `class Solution:
    def findMedianSortedArrays(self, nums1: List[int], nums2: List[int]) -> float:
        pass`,
    javascript: `/**
 * @param {number[]} nums1
 * @param {number[]} nums2
 * @return {number}
 */
var findMedianSortedArrays = function(nums1, nums2) {

};`,
    java: `class Solution {
    public double findMedianSortedArrays(int[] nums1, int[] nums2) {
        return 0.0;
    }
}`,
  },
  'powx-n': {
    python: `class Solution:
    def myPow(self, x: float, n: int) -> float:
        pass`,
    javascript: `/**
 * @param {number} x
 * @param {number} n
 * @return {number}
 */
var myPow = function(x, n) {

};`,
    java: `class Solution {
    public double myPow(double x, int n) {
        return 0.0;
    }
}`,
  },
  'merge-k-sorted-lists': {
    python: `# Definition for singly-linked list.
# class ListNode:
#     def __init__(self, val=0, next=None):
#         self.val = val
#         self.next = next
class Solution:
    def mergeKLists(self, lists: List[Optional[ListNode]]) -> Optional[ListNode]:
        pass`,
    javascript: `/**
 * Definition for singly-linked list.
 * function ListNode(val, next) { this.val = (val===undefined ? 0 : val); this.next = (next===undefined ? null : next); }
 *
 * @param {ListNode[]} lists
 * @return {ListNode}
 */
var mergeKLists = function(lists) {

};`,
    java: `/**
 * Definition for singly-linked list.
 * public class ListNode { int val; ListNode next; ListNode(int x) { val = x; } }
 */
class Solution {
    public ListNode mergeKLists(ListNode[] lists) {
        return null;
    }
}`,
  },
};

export function getBareSnippet(slug, language) {
  return BARE_SNIPPETS[slug]?.[language] || null;
}
