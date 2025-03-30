import {
  isNonBlank,
  isStatusPage,
  isSubmissionPage,
  isWaitingJudge,
} from './utils/boj';
import { createToggle } from './utils/ui';

/****************************************************
 * Global
 ****************************************************/
let isAlgoHubEnabled = true;

const onChangeEnabled = (status: boolean) => {
  isAlgoHubEnabled = status;
};

/****************************************************
 * Submission Page Logic
 ****************************************************/
const handleSubmissionPage = (): void => {
  waitForElement('#submit_button', () => {
    const submitButton =
      document.querySelector<HTMLButtonElement>('#submit_button');
    if (!submitButton) return;

    // 1) AlgoHub 라디오 버튼 그룹 생성 및 UI 배치
    createToggle({
      target: submitButton,
      onChangeEnabled,
      placement: 'right',
    });

    // 2) 기존 제출 버튼 클릭 이벤트 가로채기
    interceptSubmitButtonClick(submitButton);
  });
};

/**
 * 제출 버튼 클릭 시 코드를 백그라운드로 전송.
 */
const interceptSubmitButtonClick = (submitButton: HTMLButtonElement): void => {
  submitButton.addEventListener('click', function () {
    const code = getCodeFromCodeMirror();
    const username = getUsername();
    const problemId = getProblemId();

    if (code && username && problemId) {
      chrome.runtime.sendMessage(
        {
          action: 'saveCode',
          code,
          username,
          problemId,
          isAlgoHubEnabled,
        },
        (response) => {
          console.log('[algohub] 코드 저장 응답:', response);
        },
      );
    } else {
      console.log('[algohub] 저장할 데이터 중 일부가 없음');
    }
  });
};

/****************************************************
 * Status Page Logic
 ****************************************************/
const handleStatusPage = (): void => {
  chrome.runtime.sendMessage({ action: 'getCode' }, (result: any) => {
    let {
      algohub_submitted_code: code,
      algohub_username: username,
      algohub_problem_id: problemId,
      algohub_enabled: isEnabled,
    } = result || {};

    // status 페이지의 query string에서도 username, problemId 보조 가져오기
    const urlParams = new URLSearchParams(window.location.search);
    username = username || urlParams.get('user_id');
    problemId = problemId || urlParams.get('problem_id');

    if (!username || !problemId) {
      console.log('[algohub] 사용자 정보 또는 문제 ID를 찾을 수 없음');
      return;
    }

    if (isEnabled === false) {
      console.log('[algohub] AlgoHub 공유가 비활성화 된 풀이');
      return;
    }

    console.log('[algohub] 채점 현황 페이지 처리 시작');
    checkResultRepeatedly({ code, username, problemId, isEnabled });
  });
};

interface CheckResultRepeatedlyParams {
  code: string;
  username: string;
  problemId: string;
  isEnabled: boolean;
}

interface ExtractedData {
  submissionNumber: string | undefined;
  userId: string | undefined;
  problemNumber: string | undefined;
  result: string | undefined;
  memory: string | undefined;
  time: string | undefined;
  language: string | undefined;
  codeLength: string | undefined;
}

interface ValidData {
  submissionNumber: string;
  userId: string;
  problemNumber: string;
  result: string;
  memory: string;
  time: string;
  language: string;
  codeLength: string;
}

export const checkResultRepeatedly = ({
  code,
  username,
  problemId,
  isEnabled,
}: CheckResultRepeatedlyParams): void => {
  let attempts = 0;
  const maxAttempts = 5 * 60; // 최대 300번 시도 (5분)

  const findMyResultRow = (): HTMLTableRowElement | undefined => {
    const rows = document.querySelectorAll<HTMLTableRowElement>(
      'table.table-bordered tbody tr',
    );
    return Array.from(rows).find((row) =>
      row.classList.contains('result-mine'),
    );
  };

  const extractRowData = (row: HTMLTableRowElement): ExtractedData => {
    return {
      submissionNumber: row
        .querySelector('td:nth-child(1)')
        ?.textContent?.trim(),
      userId: row.querySelector('td:nth-child(2) a')?.textContent?.trim(),
      problemNumber: row
        .querySelector('td:nth-child(3) a')
        ?.textContent?.trim()
        .match(/\d+/)?.[0],
      result: row
        .querySelector('td:nth-child(4) .result-text')
        ?.textContent?.trim(),
      memory: row.querySelector('td:nth-child(5)')?.textContent?.trim(),
      time: row.querySelector('td:nth-child(6)')?.textContent?.trim(),
      language: row
        .querySelector('td:nth-child(7)')
        ?.textContent?.trim()
        .split(' / ')[0],
      codeLength: row.querySelector('td:nth-child(8)')?.textContent?.trim(),
    };
  };

  const isValidExtractedData = (data: ExtractedData): data is ValidData => {
    return (
      data.submissionNumber !== undefined &&
      data.userId !== undefined &&
      data.problemNumber !== undefined &&
      data.result !== undefined &&
      data.memory !== undefined &&
      data.time !== undefined &&
      data.language !== undefined &&
      data.codeLength !== undefined
    );
  };

  const pollResult = (): void => {
    const myResultRow = findMyResultRow();
    if (!myResultRow) {
      scheduleNextPoll();
      return;
    }

    const extractedData = extractRowData(myResultRow);
    if (!isNonBlank(extractedData)) {
      scheduleNextPoll();
      return;
    }

    if (!isValidExtractedData(extractedData)) {
      scheduleNextPoll();
      return;
    }

    console.log('[algohub] 현재 행 정보', extractedData);

    const isMySubmission =
      extractedData.userId === username &&
      extractedData.problemNumber === problemId &&
      !isWaitingJudge(extractedData.result);

    if (isMySubmission) {
      console.log('[algohub] 채점 완료 감지');
      handleJudgeResultRow({
        submissionNumber: extractedData.submissionNumber,
        userId: extractedData.userId,
        problemNumber: extractedData.problemNumber,
        result: extractedData.result,
        sourceCode: code,
        memory: extractedData.memory,
        time: extractedData.time,
        language: extractedData.language,
        codeLength: extractedData.codeLength,
        isEnabled,
      });
      return;
    }

    scheduleNextPoll();
  };

  const scheduleNextPoll = (): void => {
    attempts++;
    if (attempts < maxAttempts) {
      setTimeout(pollResult, 1000);
    } else {
      console.log('[algohub] 채점 시간이 초과되어 결과를 찾지 못함');
    }
  };

  pollResult();
};

interface HandleJudgeResultRowParams {
  submissionNumber: string;
  userId: string;
  problemNumber: string;
  result: string;
  sourceCode: string;
  memory: string;
  time: string;
  language: string;
  codeLength: string;
  isEnabled: boolean;
}

const handleJudgeResultRow = ({
  submissionNumber,
  userId,
  problemNumber,
  result,
  sourceCode,
  memory,
  time,
  language,
  codeLength,
  isEnabled,
}: HandleJudgeResultRowParams): void => {
  console.log('[algohub] 채점 결과 확인', result);

  if (isEnabled && sourceCode) {
    sendToAPI({
      code: sourceCode,
      problemId: problemNumber,
      username: userId,
      memoryUsage: memory,
      executionTime: time,
      codeType: language,
      codeLength,
      result,
    });

    chrome.runtime.sendMessage({
      action: 'saveCode',
      code: null,
      username: null,
      problemId: null,
      isAlgoHubEnabled: null,
    });
  } else {
    console.log('[algohub] AlgoHub가 비활성화되어 있거나 저장된 코드 없음');
  }
};

/****************************************************
 * Helper Functions
 ****************************************************/
const waitForElement = (selector: string, callback: () => void): void => {
  if (document.querySelector(selector)) {
    callback();
  } else {
    setTimeout(() => waitForElement(selector, callback), 100);
  }
};

const getCodeFromCodeMirror = (): string | null => {
  const codeLines = document.querySelectorAll('.CodeMirror-line');
  if (!codeLines || codeLines.length === 0) {
    return null;
  }
  return Array.from(codeLines)
    .map((line) => line.textContent || '')
    .join('\n');
};

const getUsername = (): string | null => {
  const usernameElement = document.querySelector('.username');
  if (usernameElement && usernameElement.textContent) {
    return usernameElement.textContent.trim();
  }
  console.log('[algohub] 사용자 이름을 찾을 수 없음');
  return null;
};

const getProblemId = (): string | null => {
  const match = window.location.href.match(/\/submit\/(\d+)/);
  if (match && match[1]) {
    return match[1];
  }
  console.log('[algohub] 문제 ID를 찾을 수 없음');
  return null;
};

/****************************************************
 * API Sending
 ****************************************************/
interface SendToAPIParams {
  code: string;
  problemId: string;
  username: string;
  memoryUsage: string;
  executionTime: string;
  codeType: string;
  codeLength: string;
  result: string;
}

const sendToAPI = ({
  code,
  problemId,
  username,
  memoryUsage,
  executionTime,
  codeType,
  codeLength,
  result,
}: SendToAPIParams): void => {
  console.log('[algohub] AlgoHub API 호출');

  const problemNumber = parseInt(problemId, 10);
  const memoryUsageInt = parseInt(memoryUsage || '0', 10);
  const executionTimeInt = parseInt(executionTime || '0', 10);
  const codeLengthInt = parseInt(codeLength, 10);
  const cleanedCodeType = codeType.split('/')[0];

  const data = {
    userName: username,
    code,
    codeType: cleanedCodeType,
    result,
    memoryUsage: memoryUsageInt,
    executionTime: executionTimeInt,
    codeLength: codeLengthInt,
    problemNumber,
  };

  console.log('[algohub] 전송할 데이터', data);

  chrome.runtime.sendMessage({ action: 'sendToAPI', data }, (response: any) => {
    if (response?.error) {
      console.error('[algohub] API 오류:', response);
    }
  });
};

/****************************************************
 * Entry points
 ****************************************************/
const bojInit = () => {
  // 제출 페이지
  if (isSubmissionPage()) {
    handleSubmissionPage();
  }

  // 채점 현황 페이지
  if (isStatusPage()) {
    window.addEventListener('load', () => {
      handleStatusPage();
    });
  }
};

export default bojInit;
