import { createToggle } from './utils/ui';

let isAlgoHubEnabled = false;

const onChangeEnabled = (status: boolean) => {
  isAlgoHubEnabled = status;
};

const interceptSubmitButtonClick = (submitButton: HTMLButtonElement): void => {
  submitButton.addEventListener('click', () => {
    chrome.runtime.sendMessage({
      action: 'saveCode',
    });
  });
};

(() => {
  const viewSolutionGroup = document.querySelector<HTMLButtonElement>(
    '#view-solution-group',
  );

  const submitButton =
    document.querySelector<HTMLButtonElement>('#submit-code');
  if (!viewSolutionGroup || !submitButton) return;

  createToggle({
    target: viewSolutionGroup,
    onChangeEnabled,
    placement: 'left',
  });

  interceptSubmitButtonClick(submitButton);
})();
