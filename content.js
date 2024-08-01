let isAlgoHubEnabled = false;

// 제출 페이지 처리
if (window.location.href.match(/\/submit\/\d+/)) {
    function waitForElement(selector, callback) {
        if (document.querySelector(selector)) {
            callback();
        } else {
            setTimeout(() => waitForElement(selector, callback), 100);
        }
    }

    waitForElement('#submit_button', () => {
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
            const code = getCode();
            const username = getUsername();
            const problemId = getProblemId();
            
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
    window.addEventListener('load', () => {
        checkResult();
    });
}

function getCode() {
    const codeLines = document.querySelectorAll('.CodeMirror-line');
    const extractedCode = Array.from(codeLines).map(line => {
        return line.textContent;
    }).join('\n');
    return extractedCode;
}

function getUsername() {
    const usernameElement = document.querySelector('.username');
    if (usernameElement) {
        return usernameElement.textContent.trim();
    } else {
        console.log("[algohub] 사용자 이름을 찾을 수 없음");
        return null;
    }
}

function getProblemId() {
    const match = window.location.href.match(/\/submit\/(\d+)/);
    if (match) {
        return match[1];
    } else {
        console.log("[algohub] 문제 ID를 찾을 수 없음");
        return null;
    }
}

function checkResult() {
    chrome.runtime.sendMessage({action: "getCode"}, (result) => {
        let { algohub_submitted_code: code, algohub_username: username, algohub_problem_id: problemId, algohub_enabled: isEnabled } = result;
        
        if (!username || !problemId) {
            const urlParams = new URLSearchParams(window.location.search);
            username = username || urlParams.get('user_id');
            problemId = problemId || urlParams.get('problem_id');
        }

        if (!username || !problemId) {
            console.log("[algohub] 사용자 정보 또는 문제 ID를 찾을 수 없음");
            return;
        }

        if (isEnabled === false) {
            console.log("[algohub] AlgoHub 공유가 비활성화 된 풀이");
            return;
        }

        let attempts = 0;
        const maxAttempts = 5*60; // 최대 300번 시도 (5분)

        tryCheckResult();

        function tryCheckResult() {
            const resultRows = document.querySelectorAll('table.table-bordered tbody tr');
            
            for (let row of resultRows) {
                const rowUsername = row.querySelector('td:nth-child(2)').textContent.trim();
                const rowProblemId = row.querySelector('td:nth-child(3) a').textContent.trim();
                const resultElement = row.querySelector('td:nth-child(4) .result-text');
                const memoryUsage = row.querySelector('td:nth-child(5)').textContent.trim(); // 메모리 추출
                const executionTime = row.querySelector('td:nth-child(6)').textContent.trim(); // 실행 시간 추출
                const codeType = row.querySelector('td:nth-child(7)').textContent.trim(); // 언어 추출
                const codeLength = row.querySelector('td:nth-child(8)').textContent.trim(); // 코드 길이 추출

                if (rowUsername === username && rowProblemId === problemId && resultElement) {
                    // 아직 채점 중인 경우
                    if (resultElement.textContent.includes("채점 중") || resultElement.textContent.includes("채점 준비 중") || resultElement.textContent.includes("기다리는 중")) {
                        attempts++;
                        if (attempts < maxAttempts) {
                            setTimeout(tryCheckResult, 1000); // 1초 후 재시도
                        } else {
                            console.log("[algohub] 채점 시간이 초과 됨 (5분)");
                        }
                        return;
                    }
                    else{ // 채점 완료 감지
                        console.log("[algohub] 채점 완료 감지");
                        if (isEnabled && code) {
                            sendToAPI({
                                code,
                                problemId,
                                username,
                                memoryUsage,
                                executionTime,
                                codeType,
                                codeLength,
                                result: resultElement.textContent.trim()
                            });
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
                setTimeout(tryCheckResult, 1000);
            } else {
                console.log("[algohub] 채점 시간이 초과되어 결과를 찾지 못함");
            }
        }
    });
}

function sendToAPI({ code, problemId, username, memoryUsage, executionTime, codeType, codeLength, result }) {
    console.log("[algohub] AlgoHub API 호출");

    // 문자열에서 정수로 변환
    const problemNumber = parseInt(problemId, 10);
    const memoryUsageInt = parseInt(memoryUsage, 10);
    const executionTimeInt = parseInt(executionTime, 10);
    const codeLengthInt = parseInt(codeLength, 10);
    const cleanedCodeType = codeType.split('/')[0];

    const data = { 
        userName: username,
        code: code,
        codeType: cleanedCodeType,
        result: result,
        memoryUsage: memoryUsageInt,
        executionTime: executionTimeInt,
        codeLength: codeLengthInt,
        problemNumber: problemNumber
    };

    chrome.runtime.sendMessage({action: "sendToAPI", data: data}, response => {
        if (response.error){
            console.error("[algohub] API 오류:", response.error);
        }
    });
}