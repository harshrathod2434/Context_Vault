/**
 * Quick Groq API key tester — mirrors the exact logic from groqService.testApiKey()
 * Usage: node test-key.js YOUR_GROQ_API_KEY
 * The key is passed as a CLI argument and never written to disk.
 */

const axios = require("axios");

const key = process.argv[2];

if (!key) {
  console.error("❌ Usage: node test-key.js YOUR_GROQ_API_KEY");
  process.exit(1);
}

console.log(`🔑 Testing key: ${key.slice(0, 8)}...${key.slice(-4)}`);
console.log("📡 Sending request to Groq API...\n");

axios
  .post(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: "Reply with one short word." },
        { role: "user", content: "ping" },
      ],
      temperature: 0.1,
    },
    {
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      timeout: 15000,
    }
  )
  .then((res) => {
    const reply = res.data?.choices?.[0]?.message?.content || "(empty)";
    console.log("✅ SUCCESS — Groq API key is valid!");
    console.log(`   Model responded: "${reply}"`);
    console.log(`   Model: ${res.data?.model}`);
    console.log(`   Tokens used: ${res.data?.usage?.total_tokens}`);
    console.log("\n🎉 Your key works. You can safely paste it into ContextVault.");
  })
  .catch((err) => {
    const status = err.response?.status;
    const msg = err.response?.data?.error?.message || err.message;
    console.error(`❌ FAILED — Status: ${status || "N/A"}`);
    console.error(`   Error: ${msg}`);
    if (status === 401) {
      console.error("   → Invalid API key. Check that you copied the full key.");
    } else if (status === 429) {
      console.error("   → Rate limited. Wait a moment and try again.");
    } else {
      console.error("   → Check your internet connection or Groq account status.");
    }
    process.exit(1);
  });
