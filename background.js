chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "saveCode") {
        console.log("[algohub] 백그라운드: 코드 저장 시도", {
            codeLength: request.code ? request.code.length : 0,
            username: request.username,
            problemId: request.problemId,
            isAlgoHubEnabled: request.isAlgoHubEnabled
        });
        
        chrome.storage.local.set({
            algohub_submitted_code: request.code,
            algohub_username: request.username,
            algohub_problem_id: request.problemId,
            algohub_enabled: request.isAlgoHubEnabled
        }, () => {
            if (chrome.runtime.lastError) {
                console.error("[algohub] 백그라운드: 저장 중 오류 발생", chrome.runtime.lastError);
                sendResponse({status: "error", message: chrome.runtime.lastError.message});
            } else {
                chrome.storage.local.get(null, (result) => {
                    console.log("[algohub] 백그라운드: 저장 후 전체 데이터", {
                        codeLength: result.algohub_submitted_code ? result.algohub_submitted_code.length : 0,
                        username: result.algohub_username,
                        problemId: result.algohub_problem_id,
                        isAlgoHubEnabled: result.algohub_enabled
                    });
                });
                sendResponse({status: "success"});
            }
        });
        return true; // 비동기 응답을 위해 true 반환
    }
    else if (request.action === "getCode") {
        chrome.storage.local.get(null, (result) => {
            console.log("[algohub] 백그라운드: 코드 조회 결과", {
                codeLength: result.algohub_submitted_code ? result.algohub_submitted_code.length : 0,
                username: result.algohub_username,
                problemId: result.algohub_problem_id,
                isAlgoHubEnabled: result.algohub_enabled
            });
            sendResponse(result);
        });
        return true; // 비동기 응답을 위해 true 반환
    }
    else if (request.action === "sendToAPI") {
        fetch('http://localhost:8080/api/solution', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(request.data)
        })
        .then(response => {
            if (response.status === 200) {
                return { success: true, message: "API 요청 성공" };
            } else {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
        })
        .catch(error => {
            console.error("[algohub] 백그라운드: API 오류", error);
            sendResponse({success: false, error: error.toString()});
        });
        return true;  // 비동기 응답을 위해 true를 반환
    }
});