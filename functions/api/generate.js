export async function onRequestPost(context) {
  const { request, env } = context;
  
  try {
    const { toolName, toolUrl, useCase } = await request.json();

    // 將 System Prompt 封裝在後端，避免使用者竄改
    const systemInstruction = `你現在是一位專業的「MyGoPen 查核工具教學老師」。
你的任務是接收使用者輸入的「工具名稱」「工具網址」與「查證案例」，並將這些資訊轉化為一篇排版完整的 Blogger 專用 HTML 查核文章。
【寫作與語氣規範】
保持客觀、中立、明瞭，絕對不帶主觀情緒或嘲諷。現在是 2026 年，所有時事背景請以此為準。
嚴格禁用「總結來說」、「值得注意的是」、「總而言之」等 AI 常見套話。
必須將使用者提供工具網址，精準填入 HTML 的 <a href="..."> 標籤中。
你的輸出「只能」是 HTML 程式碼與最底下的標題名稱。請直接輸出，不要在開頭或結尾加上 \`\`\`html 或任何多餘的解釋文字。
【HTML 樣板結構與填寫規範】
請務必嚴格遵守以下案例文章的 HTML 結構，將你整理好的內容填入適切的對應位置，不要隨意新增或刪除 HTML 標籤的 class 或 style：
--案例文章--
<div class="separator" style="clear: both;">[首圖]</div><br />
MapChecking 地圖人數統計工具，網站於 2017 年架設，創始人是一位法國人 Anthony Catel，當時正值法國總統大選期間，一名候選人在造勢活動，聲稱台下有 20 萬名支持者，記者和民眾卻發現，這個數字與現場照片相差極大，於是催生出 MapChecking 這樣一個以較為科學的方式，估算人數的網站。<br /><br />[工具截圖]<br /><br />工具：<a href="[工具網址]">[工具網址]</a><br /><br />MapChecking 的使用方法很簡單，只需在地圖上，以點擊方式圈選活動範圍，即可估算該場域可以容納的人數。MapChecking 也有提供模擬圖，讓你能夠輕鬆看出「1人／每平方公尺」、「3人／每平方公尺」、「5人／每平方公尺」之間的密集度差異。<br /><br />台灣的選舉場合，主持人往往為了拉抬聲勢，人數越喊越多，現場破 10 萬、破 20 萬人都有，只要知道造勢場地，搭配現場空拍圖，就能大致估算人數有多少。<br /><br />[操作圖片]<br /><br />在 2026 年的年底台灣也將舉行地方選舉，屆時將會有大大小小的造勢活動，只要學會 MapChecking，下次候選人在台上喊出「現場多少人」的時候，你也可以在家動動手指，估算看看他說的對不對喔！`;

    const userMessage = `請根據以下資訊生成 HTML 文章：\n工具名稱：${toolName}\n工具網址：${toolUrl}\n查證案例：${useCase}`;

    // 使用 Gemini 1.5 Flash (快速且便宜)
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${env.GEMINI_API_KEY}`;

    const geminiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: systemInstruction }]
        },
        contents: [{
          role: "user",
          parts: [{ text: userMessage }]
        }],
        generationConfig: {
          temperature: 0.2 // 降低隨機性，讓格式更穩定
        }
      })
    });

    const data = await geminiResponse.json();
    
    if (!geminiResponse.ok) {
      throw new Error(data.error?.message || 'Gemini API 發生錯誤');
    }

    const generatedText = data.candidates[0].content.parts[0].text;

    return new Response(JSON.stringify({ result: generatedText }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
