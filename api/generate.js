import axios from "axios";

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const { input } = req.body;
  if (!input) return res.status(400).json({ error: "Input is required" });

  try {
    const ZHIPU_API_KEY = process.env.ZHIPU_API_KEY;
    const response = await axios.post(
      "https://open.bigmodel.cn/api/paas/v4/chat/completions",
      {
        model: "glm-4",
        messages: [
          {
            role: "user",
            content: `请以“未来的我”的口吻，写一封温柔、充满希望的信件，回应我写的：“${input}”`
          }
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${ZHIPU_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    const reply =
      response.data.choices?.[0]?.message?.content ||
      "未来还没来得及回信，请稍后再试。";

    res.status(200).json({ reply });
  } catch (err) {
    res.status(500).json({ error: "AI接口调用失败", details: err.message });
  }
}
