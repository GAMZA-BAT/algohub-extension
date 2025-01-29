(() => {
  const styleEl = document.createElement('style');
  styleEl.textContent = `
    /* (1) 기본 라디오 모양 제거 */
    input[type="radio"].custom-radio {
      appearance: none; /* 최신 브라우저 */
      -webkit-appearance: none; /* 구형 Safari */
      
      /* 원하는 크기와 모양 지정 */
      width: 16px;
      height: 16px;
      border: 2px solid #ffffff !important; /* 테두리 흰색 */
      border-radius: 50% !important;        /* 동그라미 모양 */
      background-color: #ffffff !important; 
      
      cursor: pointer;
      outline: none;
      vertical-align: middle; /* 텍스트 라벨과 수직 정렬 맞춤 */
      margin-right: 5px;      /* 라벨과 약간 간격 */
    }

    /* (2) 라디오가 선택되었을 때 내부 색상 채우기 */
    input[type="radio"].custom-radio:checked {
      background-color: #000000 !important; /* 내부 검정색으로 채움 */
    }
  `;
  document.head.appendChild(styleEl);
})();

const createAlgoHubToggleGroup = (
  onChangeEnabled: (status: boolean) => void,
): HTMLDivElement => {
  const group = document.createElement('div');
  group.style.display = 'flex';
  group.style.alignItems = 'center';
  group.style.marginLeft = '10px';

  const algoHubIcon = document.createElement('img');
  algoHubIcon.src = chrome.runtime.getURL('dist/assets/icon.png');
  algoHubIcon.style.width = '20px';
  algoHubIcon.style.height = '20px';
  algoHubIcon.style.marginRight = '5px';

  const label = document.createElement('span');
  label.textContent = 'AlgoHub 제출';
  label.style.marginRight = '10px';
  label.style.fontSize = '15px';
  label.style.color = '#FFFFFF';

  const { radioOn, radioOnLabel, radioOff, radioOffLabel } =
    createAlgoHubRadioButtons(onChangeEnabled);

  radioOnLabel.style.color = '#FFFFFF';
  radioOffLabel.style.color = '#FFFFFF';

  const radioStyle = `
    accent-color: #000000;
    border: 2px solid #FFFFFF;
  `;
  radioOn.style.cssText = radioStyle;
  radioOff.style.cssText = radioStyle;

  group.appendChild(algoHubIcon);
  group.appendChild(label);
  group.appendChild(radioOn);
  group.appendChild(radioOnLabel);
  group.appendChild(radioOff);
  group.appendChild(radioOffLabel);

  return group;
};

const createAlgoHubRadioButtons = (
  onChangeEnabled: (status: boolean) => void,
): {
  radioOn: HTMLInputElement;
  radioOnLabel: HTMLLabelElement;
  radioOff: HTMLInputElement;
  radioOffLabel: HTMLLabelElement;
} => {
  const radioOn = document.createElement('input');
  radioOn.type = 'radio';
  radioOn.name = 'algohub_toggle';
  radioOn.id = 'algohub_on';
  radioOn.style.marginRight = '5px';
  radioOn.classList.add('custom-radio');
  const radioOnLabel = document.createElement('label');
  radioOnLabel.textContent = '제출';
  radioOnLabel.htmlFor = 'algohub_on';
  radioOnLabel.style.marginRight = '10px';

  const radioOff = document.createElement('input');
  radioOff.type = 'radio';
  radioOff.name = 'algohub_toggle';
  radioOff.id = 'algohub_off';
  radioOff.checked = true;
  radioOff.classList.add('custom-radio');
  radioOff.style.marginRight = '5px';

  const radioOffLabel = document.createElement('label');
  radioOffLabel.textContent = '미제출';
  radioOffLabel.htmlFor = 'algohub_off';

  const updateToggleState = (): void => {
    onChangeEnabled(radioOn.checked);
  };

  // 라디오 버튼에 이벤트 연결
  radioOn.addEventListener('change', updateToggleState);
  radioOff.addEventListener('change', updateToggleState);

  return { radioOn, radioOnLabel, radioOff, radioOffLabel };
};

const createSubmissionPageContainer = (
  submitButton: HTMLButtonElement,
  algoHubToggleGroup: HTMLDivElement,
  placement: 'left' | 'right',
): HTMLDivElement => {
  const container = document.createElement('div');
  container.style.display = 'flex';
  container.style.alignItems = 'center';

  // 부모 노드가 있을 때만 append
  if (submitButton.parentNode) {
    submitButton.parentNode.insertBefore(container, submitButton);
    if (placement === 'left') {
      container.appendChild(algoHubToggleGroup);
      container.appendChild(submitButton);
    } else {
      // 기본값 right
      container.appendChild(submitButton);
      container.appendChild(algoHubToggleGroup);
    }
  }

  return container;
};

interface createToggleProps {
  target: HTMLButtonElement;
  onChangeEnabled: (status: boolean) => void;
  placement: 'left' | 'right';
}

export const createToggle = ({
  target,
  onChangeEnabled,
  placement,
}: createToggleProps) => {
  const toggleGroup = createAlgoHubToggleGroup(onChangeEnabled);
  const container = createSubmissionPageContainer(
    target,
    toggleGroup,
    placement,
  );

  return container;
};
