console.log("[algohub] 스크립트 시작");

let isAlgoHubEnabled = false;

// 제출 페이지 처리
if (window.location.href.match(/\/submit\/\d+/)) {
    console.log("[algohub] 문제 제출 페이지 감지");

    function waitForElement(selector, callback) {
        if (document.querySelector(selector)) {
            callback();
        } else {
            setTimeout(() => waitForElement(selector, callback), 100);
        }
    }

    waitForElement('#submit_button', () => {
        console.log("[algohub] 제출 버튼 찾음");
        const submitButton = document.querySelector('#submit_button');
        
        // AlgoHub 제출 토글 버튼 생성
        const algoHubToggle = document.createElement('button');
        algoHubToggle.style.display = 'flex';
        algoHubToggle.style.marginTop = '10px';
        algoHubToggle.style.backgroundColor = 'transparent';
        algoHubToggle.style.border = 'none';
        algoHubToggle.style.cursor = 'pointer';

        // 아이콘 이미지 추가
        const icon = document.createElement('img');
        icon.src = chrome.runtime.getURL('icon.png');
        icon.style.width = '30px';
        icon.style.height = '30px';
        icon.style.marginRight = '5px';
        algoHubToggle.appendChild(icon);

        // "공유" 텍스트 추가
        const shareText = document.createElement('span');
        shareText.textContent = '공유';
        shareText.style.fontSize = '15px';
        algoHubToggle.appendChild(shareText);

        function updateToggleState() {
            algoHubToggle.style.opacity = isAlgoHubEnabled ? '1' : '0.5';
            algoHubToggle.title = `AlgoHub 공유: ${isAlgoHubEnabled ? 'On' : 'Off'}`;
        }

        algoHubToggle.addEventListener('click', function(event) {
            event.preventDefault();
            isAlgoHubEnabled = !isAlgoHubEnabled;
            updateToggleState();
            console.log("[algohub] 토글 상태 변경:", isAlgoHubEnabled);
        });

        submitButton.parentNode.insertBefore(algoHubToggle, submitButton.nextSibling);
        updateToggleState();
        
        // 기존 제출 버튼의 클릭 이벤트를 가로챔, 새로운 처리를 추가
        submitButton.addEventListener('click', function(event) {
            console.log("[algohub] 제출 버튼 클릭");
            
            const code = getCode();
            const username = getUsername();
            const problemId = getProblemId();
            
            console.log("[algohub] 추출된 코드:", code);
            console.log("[algohub] 저장할 데이터:", { code: code.substring(0, 100) + "...", username, problemId });
            console.log("[algohub] AlgoHub 제출 상태:", isAlgoHubEnabled);
            
            if (code && username && problemId) {
                chrome.runtime.sendMessage({
                    action: "saveCode",
                    code: code,
                    username: username,
                    problemId: problemId,
                    isAlgoHubEnabled: isAlgoHubEnabled
                }, (response) => {
                    console.log("[algohub] 코드 저장 응답:", response);
                });
            } else {
                console.log("[algohub] 저장할 데이터 중 일부가 없음");
            }
        });
    });
}

// 채점 현황 페이지 처리
if (window.location.href.match(/\/status/)) {
    console.log("[algohub] 채점 현황 페이지 감지");
    
    window.addEventListener('load', () => {
        console.log("[algohub] 페이지 로드 완료");
        checkResult();
    });
}

function getCode() {
    const codeLines = document.querySelectorAll('.CodeMirror-line');
    const extractedCode = Array.from(codeLines).map(line => {
        return line.textContent.trim();
    }).join('\n');
    console.log("[algohub] 추출된 코드:", extractedCode);
    return extractedCode;
}

function getUsername() {
    const usernameElement = document.querySelector('.username');
    if (usernameElement) {
        console.log("[algohub] 사용자 이름 확인: " + usernameElement.textContent.trim());
        return usernameElement.textContent.trim();
    } else {
        console.log("[algohub] 사용자 이름을 찾을 수 없음");
        return null;
    }
}

function getProblemId() {
    const match = window.location.href.match(/\/submit\/(\d+)/);
    if (match) {
        console.log("[algohub] 문제 ID 확인: " + match[1]);
        return match[1];
    } else {
        console.log("[algohub] 문제 ID를 찾을 수 없음");
        return null;
    }
}

function checkResult() {
    console.log("[algohub] 결과 확인 시작");
    chrome.runtime.sendMessage({action: "getCode"}, (result) => {
        console.log("[algohub] 저장된 데이터 조회 결과:", result);
        let { algohub_submitted_code: code, algohub_username: username, algohub_problem_id: problemId, algohub_enabled: isEnabled } = result;
        
        if (!username || !problemId) {
            const urlParams = new URLSearchParams(window.location.search);
            username = username || urlParams.get('user_id');
            problemId = problemId || urlParams.get('problem_id');
            console.log("[algohub] URL에서 추출한 정보:", { username, problemId });
        }

        if (!username || !problemId) {
            console.log("[algohub] 사용자 정보 또는 문제 ID를 찾을 수 없음");
            return;
        }

        console.log("[algohub] 확인할 정보:", { username, problemId, isEnabled });

        if (isEnabled === false) {
            console.log("[algohub] AlgoHub 제출이 비활성화되어 있어 결과 확인을 중단합니다.");
            return;
        }

        let attempts = 0;
        const maxAttempts = 5*60; // 최대 300번 시도 (5분)

        tryCheckResult();

        function tryCheckResult() {
            const resultRows = document.querySelectorAll('table.table-bordered tbody tr');
            console.log("[algohub] 결과 행 수:", resultRows.length);
            
            for (let row of resultRows) {
                const rowUsername = row.querySelector('td:nth-child(2)').textContent.trim();
                const rowProblemId = row.querySelector('td:nth-child(3) a').textContent.trim();
                const resultElement = row.querySelector('td:nth-child(4) .result-text');
                const submissionId = row.querySelector('td:nth-child(1)').textContent.trim(); // 제출 번호 추출

                console.log("[algohub] 행 정보:", { rowUsername, rowProblemId, resultText: resultElement ? resultElement.textContent : 'N/A', submissionId });

                if (rowUsername === username && rowProblemId === problemId && resultElement) {
                    console.log("[algohub] 결과 요소 발견");
                    console.log("[algohub] 결과 확인: " + resultElement.textContent);
                    
                    if (resultElement.textContent.includes("채점 중") || resultElement.textContent.includes("채점 준비 중") || resultElement.textContent.includes("기다리는 중")) {
                        console.log("[algohub] 채점 중 상태 감지. 대기 후 재시도.");
                        attempts++;
                        if (attempts < maxAttempts) {
                            setTimeout(tryCheckResult, 1000); // 1초 후 재시도
                        } else {
                            console.log("[algohub] 최대 시도 횟수 초과. 채점 결과를 기다리는 데 실패했습니다.");
                        }
                        return;
                    }
                    
                    // 채점이 완료된 경우
                    if (!resultElement.textContent.includes("채점 중") && !resultElement.textContent.includes("채점 준비 중")) {
                        console.log("[algohub] 채점 완료 감지");
                        if (isEnabled && code) {
                            sendToAPI(code, problemId, username, submissionId);
                            // 백그라운드 스토리지 클리어
                            chrome.runtime.sendMessage({action: "saveCode", code: null, username: null, problemId: null, isAlgoHubEnabled: null});
                        } else {
                            console.log("[algohub] AlgoHub가 비활성화되어 있거나 저장된 코드 없음");
                        }
                    }
                    return;
                }
            }
            
            attempts++;
            if (attempts < maxAttempts) {
                console.log(`[algohub] 결과를 찾지 못함. 재시도 (${attempts}/${maxAttempts})`);
                setTimeout(tryCheckResult, 1000);
            } else {
                console.log("[algohub] 최대 시도 횟수 초과. 결과를 찾지 못함.");
            }
        }
    });
}

function sendToAPI(code, problemId, username, submissionId) {
    console.log("[algohub] API로 데이터 전송 시도");
    fetch('http://localhost:8080/api/solution', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
            userName: username,
            code: code,
            problemNumber: problemId,
            submissionId: submissionId
        }),
    })
    .then(response => {
        if (response.status === 200){ 
            console.log("[algohub] API 응답 성공");
        }
    })
    .catch((error) => console.error("[algohub] API 오류:", error));
}