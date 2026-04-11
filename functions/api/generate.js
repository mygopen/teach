export async function onRequestPost(context) {
  const { request, env } = context;
  
  try {
    // 接收來自前端的 6 個欄位資料
    const { toolName, toolUrl, caseTitle, caseUrl, caseResult, useCase } = await request.json();

    // 更新 System Prompt，將使用者的 SynthID 範例作為 AI 的學習樣板
    const systemInstruction = `你現在是一位專業的「MyGoPen 查核工具教學老師」。
你的任務是接收使用者輸入的「工具名稱」「工具網址」「案例標題」「案例網址」「案例查證結果」與「查證案例情境說明」，並將這些資訊轉化為一篇排版完整的 Blogger 專用 HTML 查核文章。

【寫作與語氣規範】
1. 保持客觀、中立、明瞭，絕對不帶主觀情緒或嘲諷。現在是 2026 年，所有時事背景請以此為準。
2. 嚴格禁用「總結來說」、「值得注意的是」、「總而言之」等 AI 常見套話。
3. 必須將使用者提供的工具網址與案例網址，精準填入 HTML 的 <a href="..."> 標籤中。
4. 請將「案例標題」、「案例網址」與「案例查證結果」以自然通順的語氣融入文章段落中（參考下方範例的寫法），不要生硬地使用條列式。
5. 你的輸出「只能」是 HTML 程式碼。請直接輸出，不要在開頭或結尾加上 \`\`\`html 或任何多餘的解釋文字。

【HTML 樣板結構與填寫規範】
請務必嚴格遵守以下案例文章的 HTML 結構，將你整理好的內容填入適切的對應位置，不要隨意新增或刪除 HTML 標籤的 class 或 style：
--案例文章--
<div class="separator" style="clear: both;">[首圖]</div><br />
數位浮水印 SynthID 偵測技術，由 Google 於 2023 年推出，旨在為 AI 生成的圖像內容嵌入人眼不可見的數位浮水印。這項技術的目標是提供一種可靠的方式，辨識圖像是否由 Google 的生成式 AI 工具（如 Imagen）所創建或修改，以應對日益增長的 AI 假訊息挑戰。SynthID 的設計使其浮水印即使在圖像經過裁剪、壓縮或濾鏡處理後，仍能保持可偵測性。<br /><br />[工具截圖]<br /><br />工具：<a href="[工具網址]">[工具網址]</a><br /><br />SynthID 的應用方式，是透過 Google 的 AI 助理 Gemini 進行。使用者只需將圖片上傳至 Gemini，並提問「這是AI假圖嗎？」，Gemini 便會回覆圖片是否經 AI 修改、使用了哪些 AI 工具等詳細說明或簡短辨識結果。這使得一般民眾也能輕易地對可疑圖像進行初步查證。<br /><br />隨著生成式 AI 技術的快速發展，網路上的圖像內容真偽難辨，假訊息的傳播速度與影響力也隨之增加。這項工具提供了一個重要的辨識管道，協助使用者判斷來源。例如，MyGoPen 曾利用此工具檢測，查證<a href="[案例網址]" target="_blank">[案例標題]</a>，確實發現[案例查證結果]。這類案例突顯了該工具在辨識假訊息方面的實用性。<br /><br />[操作圖片]<br /><br />在 2026 年，假訊息已廣泛存在於網路世界，辨識真偽成為一項重要技能。學會使用這類工具，能幫助我們在面對各種資訊時，多一份查證能力，減少被誤導的風險。`;

    // 定義使用者的輸入內容
    const userMessage = `請根據以下資訊生成 HTML 文章：\n工具名稱：${toolName}\n工具網址：${toolUrl}\n案例標題：${caseTitle}\n案例網址：${caseUrl}\n案例查證結果：${caseResult}\n查證案例情境說明：${useCase}`;

    // 為 Gemma 模型將「系統指令」與「使用者訊息」合併在一起
    const combinedMessage = `${systemInstruction}\n\n---\n\n${userMessage}`;

    // 使用 Gemma 3 27B IT 模型
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemma-3-27b-it:generateContent?key=${env.GEMINI_API_KEY}`;

    const geminiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          role: "user",
          parts: [{ text: combinedMessage }]
        }],
        generationConfig: {
          temperature: 0.2 // 降低隨機性，讓格式與語氣更穩定
        }
      })
    });

    const data = await geminiResponse.json();
    
    if (!geminiResponse.ok) {
      throw new Error(data.error?.message || 'API 發生錯誤');
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
