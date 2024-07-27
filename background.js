console.log("[algohub] 백그라운드 스크립트 시작");

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("[algohub] 백그라운드: 메시지 수신", request);
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
                console.log("[algohub] 백그라운드: 코드 저장 완료");
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
        console.log("[algohub] 백그라운드: 코드 조회 시도");
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
        console.log("[algohub] 백그라운드: API 요청 시도", request.data);
        fetch('http://localhost:8080/api/solution', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(request.data)
        })
        .then(response => {
            if (response.status === 200) {
                console.log("[algohub] 백그라운드: API 응답 성공 (상태 코드 200)");
                return { success: true, message: "API request successful" };
            } else {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
        })
        .then(result => {
            console.log("[algohub] 백그라운드: API 처리 결과", result);
            sendResponse(result);
        })
        .catch(error => {
            console.error("[algohub] 백그라운드: API 오류", error);
            sendResponse({success: false, error: error.toString()});
        });
        return true;  // 비동기 응답을 위해 true를 반환
    }
});

setInterval(() => {
    chrome.storage.local.get(null, (result) => {
        console.log("[algohub] 백그라운드: 주기적 데이터 확인", {
            codeLength: result.algohub_submitted_code ? result.algohub_submitted_code.length : 0,
            username: result.algohub_username,
            problemId: result.algohub_problem_id,
            isAlgoHubEnabled: result.algohub_enabled
        });
    });
}, 5000); 

// 스토리지 변경 감지
chrome.storage.onChanged.addListener((changes, namespace) => {
    for (let key in changes) {
        let storageChange = changes[key];
        console.log("[algohub] 백그라운드: 스토리지 변경 감지",
            `키: ${key}`,
            `이전 값: ${storageChange.oldValue}`,
            `새 값: ${storageChange.newValue}`
        );
    }
});