export function typeClass(type) {
  const map = {
    Task: "bg-blue-500/15 text-blue-200",
    Project: "bg-sky-500/15 text-sky-200",
    Research: "bg-purple-500/15 text-purple-200",
    Coding: "bg-green-500/15 text-green-200",
    Bug: "bg-red-500/15 text-red-200",
    Meeting: "bg-orange-500/15 text-orange-200",
    Writing: "bg-teal-500/15 text-teal-200",
    Design: "bg-pink-500/15 text-pink-200",
    Decision: "bg-yellow-500/15 text-yellow-200",
    Prompt: "bg-indigo-500/15 text-indigo-200",
    "General Note": "bg-gray-500/15 text-gray-200"
  };
  return map[type] || map["General Note"];
}

export function sensitivityClass(level) {
  return {
    low: "bg-green-500/15 text-green-200",
    medium: "bg-amber-500/15 text-amber-200",
    high: "bg-red-500/15 text-red-200"
  }[level] || "bg-green-500/15 text-green-200";
}

export function stars(score) {
  const count = Math.max(0, Math.min(5, Math.round((Number(score) || 0) / 2)));
  return "★★★★★".slice(0, count) + "☆☆☆☆☆".slice(0, 5 - count);
}
