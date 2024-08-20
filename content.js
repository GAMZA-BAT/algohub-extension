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
        
        // AlgoHub 제출 라디오 버튼 그룹 생성
        const algoHubToggleGroup = document.createElement('div');
        algoHubToggleGroup.style.display = 'flex';
        algoHubToggleGroup.style.alignItems = 'center';
        algoHubToggleGroup.style.marginLeft = '10px'; // 제출 버튼 오른쪽에 배치하기 위한 여백

        const algoHubIcon = document.createElement('img');
        algoHubIcon.src = chrome.runtime.getURL('icon.png'); // 확장 프로그램의 icon.png 파일 경로를 사용
        algoHubIcon.style.width = '20px'; // 글자 크기와 같은 크기로 설정
        algoHubIcon.style.height = '20px';
        algoHubIcon.style.marginRight = '5px'; // 아이콘과 텍스트 사이의 간격 설정
        algoHubToggleGroup.appendChild(algoHubIcon); // 아이콘 추가

        const label = document.createElement('span');
        label.textContent = 'AlgoHub 제출';
        label.style.marginRight = '10px';
        label.style.fontSize = '15px';
        algoHubToggleGroup.appendChild(label);

        const radioOn = document.createElement('input');
        radioOn.type = 'radio';
        radioOn.name = 'algohub_toggle';
        radioOn.id = 'algohub_on';
        radioOn.style.marginRight = '5px';

        const radioOnLabel = document.createElement('label');
        radioOnLabel.textContent = '제출';
        radioOnLabel.htmlFor = 'algohub_on';
        radioOnLabel.style.marginRight = '10px';

        const radioOff = document.createElement('input');
        radioOff.type = 'radio';
        radioOff.name = 'algohub_toggle';
        radioOff.id = 'algohub_off';
        radioOff.checked = true;
        radioOff.style.marginRight = '5px';

        const radioOffLabel = document.createElement('label');
        radioOffLabel.textContent = '미제출';
        radioOffLabel.htmlFor = 'algohub_off';

        algoHubToggleGroup.appendChild(radioOn);
        algoHubToggleGroup.appendChild(radioOnLabel);
        algoHubToggleGroup.appendChild(radioOff);
        algoHubToggleGroup.appendChild(radioOffLabel);

        function updateToggleState() {
            isAlgoHubEnabled = radioOn.checked;
            console.log("[algohub] 라디오 버튼 상태 변경:", isAlgoHubEnabled);
        }

        radioOn.addEventListener('change', updateToggleState);
        radioOff.addEventListener('change', updateToggleState);

        // 제출 버튼과 라디오 버튼 그룹을 동일한 줄에 배치
        const container = document.createElement('div');
        container.style.display = 'flex';
        container.style.alignItems = 'center';

        submitButton.parentNode.insertBefore(container, submitButton);
        container.appendChild(submitButton);
        container.appendChild(algoHubToggleGroup);
        
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