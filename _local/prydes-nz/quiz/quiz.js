'use strict';

const quiz = document.querySelector('#surveyContainer');
const ui = (name, className, text) => {
  const node = document.createElement(name);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
};

function navButton(text, callback) {
  const button = ui('input');
  button.type = 'button';
  button.value = text;
  button.addEventListener('click', callback);
  return button;
}

function recommendation(product) {
  const row = ui('div', 'sv_row');
  const link = ui('a');
  link.href = product.href;
  link.target = '_blank';
  link.rel = 'noopener';
  const card = ui('div', 'pr_recProduct');
  const image = ui('img');
  image.src = './images/' + product.image;
  image.alt = '';
  card.append(image, ui('p', '', product.name));
  link.append(card);
  row.append(link);
  return row;
}

async function start() {
  const response = await fetch('./quiz-data.json');
  if (!response.ok) return;
  const data = await response.json();
  const history = [data.start];

  function render(shouldFocus) {
    const state = data.nodes[history.at(-1)];
    const question = data.questions[state.question];
    const container = ui('div', 'sv_main');
    const page = ui('div', 'sv_p_root');
    page.id = question ? question.page : 'sp_110';
    const title = ui('h1', question ? 'pr-quiz-title' : 'sv_page_title', question?.title || 'Recommended products');
    title.tabIndex = -1;

    if (question) {
      const block = ui('div');
      block.id = question.id;
      block.append(title);
      const choices = ui('div', 'pr-quiz-root');
      question.choices.forEach((label, index) => {
        const item = ui('div', 'pr-quiz-item');
        const button = ui('button', 'pr-quiz-controlLabel');
        button.type = 'button';
        button.append(ui('span', '', label));
        button.addEventListener('click', () => {
          history.push(state.next[index]);
          render(true);
        });
        item.append(button);
        choices.append(item);
      });
      block.append(choices);
      page.append(block);
    } else {
      const result = ui('div', 'sv_p_root');
      const heading = ui('div', 'sv_row');
      heading.append(title);
      const guidance = ui('div', 'sv_row');
      guidance.append(ui('h5', '', 'View products for more information.'));
      result.append(heading, guidance);
      for (const index of state.products) result.append(recommendation(data.products[index]));
      page.append(result);
    }

    const navigation = ui('div', 'sv_nav');
    if (history.length > 1) {
      navigation.append(navButton('Previous', () => {
        history.pop();
        render(true);
      }));
    }
    if (!question) {
      navigation.append(navButton('Restart', () => {
        history.length = 1;
        render(true);
      }));
    }
    container.append(page, navigation);
    quiz.replaceChildren(container);
    if (shouldFocus) title.focus({preventScroll: true});
  }

  render(false);
}

start().catch(() => {});
