chrome.runtime.onMessage.addListener(
  (
    request: any,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: any) => void,
  ) => {
    switch (request.action) {
      case 'saveCode':
        handleSaveCode(request, sendResponse);
        return true; // 비동기 응답

      case 'getCode':
        handleGetCode(sendResponse);
        return true; // 비동기 응답

      case 'sendToAPI':
        handleSendToAPI(request, sendResponse);
        return true; // 비동기 응답

      default:
        console.log('[algohub] 알 수 없는 액션:', request.action);
        break;
    }
  },
);

/****************************************************
 * Handlers
 ****************************************************/
/**
 * 메시지로 넘어온 코드를 스토리지에 저장한다.
 */
function handleSaveCode(
  request: any,
  sendResponse: (response?: any) => void,
): void {
  console.log('[algohub] 백그라운드: 코드 저장 시도', {
    codeLength: request.code ? request.code.length : 0,
    username: request.username,
    problemId: request.problemId,
    isAlgoHubEnabled: request.isAlgoHubEnabled,
  });

  chrome.storage.local.set(
    {
      algohub_submitted_code: request.code,
      algohub_username: request.username,
      algohub_problem_id: request.problemId,
      algohub_enabled: request.isAlgoHubEnabled,
    },
    () => {
      if (chrome.runtime.lastError) {
        console.error(
          '[algohub] 백그라운드: 저장 중 오류 발생',
          chrome.runtime.lastError,
        );
        sendResponse({
          status: 'error',
          message: chrome.runtime.lastError.message,
        });
      } else {
        chrome.storage.local.get(null, (result) => {
          console.log('[algohub] 백그라운드: 저장 후 전체 데이터', {
            codeLength: result.algohub_submitted_code
              ? result.algohub_submitted_code.length
              : 0,
            username: result.algohub_username,
            problemId: result.algohub_problem_id,
            isAlgoHubEnabled: result.algohub_enabled,
          });
        });
        sendResponse({ status: 'success' });
      }
    },
  );
}

/**
 * 스토리지에 저장된 코드를 조회한다.
 */
function handleGetCode(sendResponse: (response?: any) => void): void {
  chrome.storage.local.get(null, (result) => {
    console.log('[algohub] 백그라운드: 코드 조회 결과', {
      codeLength: result.algohub_submitted_code
        ? result.algohub_submitted_code.length
        : 0,
      username: result.algohub_username,
      problemId: result.algohub_problem_id,
      isAlgoHubEnabled: result.algohub_enabled,
    });
    sendResponse(result);
  });
}

/**
 * API로 코드를 전송한다.
 */
async function handleSendToAPI(
  request: any,
  sendResponse: (response?: any) => void,
): Promise<void> {
  try {
    const response = await fetch('https://api.algohub.kr/api/solutions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request.data),
    });

    if (response.status !== 200) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    sendResponse({ success: true, message: 'API 요청 성공' });
  } catch (error) {
    console.error('[algohub] 백그라운드: API 오류', error);
    sendResponse({ success: false, error: error });
  }
}
