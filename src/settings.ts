// TODO: Prevent `save` running once on init

import h from 'stage0';
import reuseNodes from 'stage0/reuseNodes';
import type { UserStorageData } from './types';
import { DEFAULT_ORDER } from './utils';

interface ItemComponent extends HTMLLIElement {
  update(newItem: string): void;
}

interface ItemRefNodes {
  name: Text;
  rm: HTMLButtonElement;
}

type ItemScope = {
  indexOf(item: string): number;
  moveItem(from: number, to: number): void;
  removeItem(index: number): void;
};

interface SettingsRefNodes {
  o: HTMLOListElement;
  reset: HTMLButtonElement;
  t: HTMLSelectElement;
}

interface SettingsState {
  order: string[];
  theme: string;
}

const itemView = h`
  <li class=item draggable=true>
    <span class=icon>☰</span>
    #name
    <button class=rm title="Remove section" #rm>REMOVE</button>
  </li>
`;

function Item(item: string, scope: ItemScope): ItemComponent {
  const root = itemView.cloneNode(true) as ItemComponent;
  const { name, rm } = itemView.collect(root) as ItemRefNodes;

  let _item = item;
  name.nodeValue = _item;

  root.ondragstart = (event) => {
    event.dataTransfer!.setData('from', scope.indexOf(_item));
    event.target!.classList.add('dragging');
  };

  root.ondragend = (event) => {
    event.target!.classList.remove('dragging');
  };

  root.ondragover = (event) => {
    event.preventDefault();
    event.dataTransfer!.dropEffect = 'move';
  };

  root.ondragenter = (event) => {
    event.target!.classList.add('over');
  };

  root.ondragleave = (event) => {
    event.target!.classList.remove('over');
  };

  root.ondrop = (event) => {
    event.preventDefault();
    const from = event.dataTransfer!.getData('from');
    scope.moveItem(from, scope.indexOf(_item));

    // Remove class in case the `dragleave` event didn't fire
    event.target!.classList.remove('over');
  };

  rm.onclick = () => scope.removeItem(scope.indexOf(_item));

  root.update = (newItem) => {
    name.nodeValue = newItem;
    _item = newItem;
  };

  return root;
}

function save(order: string[], theme: string) {
  chrome.storage.local.set({
    o: order,
    t: theme,
  });
}

const settingsView = h`
  <div>
    <div class=row>
      <label>Theme:</label>
      <select #t>
        <option value="">Dark</option>
        <option value=l>Light</option>
        <option value=b>Rich black</option>
      </select>
    </div>

    <div class=row>
      <label>List order:</label>
      <button class=reset #reset>Reset</button>
      <ul #o></ul>
    </div>
  </div>
`;

function Settings() {
  const root = settingsView;
  const { o, reset, t } = settingsView.collect(root) as SettingsRefNodes;

  const state: SettingsState = {
    order: [],
    theme: '',
  };

  const scope = {
    indexOf(item: string): number {
      return state.order.indexOf(item);
    },
    moveItem(from: number, to: number) {
      const ordered = state.order.slice();
      const item = state.order[from];

      // Remove from previous location
      ordered.splice(from, 1);

      // Add to new location
      ordered.splice(to, 0, item);

      updateOrder(ordered);
    },
    removeItem(index: number) {
      const ordered = state.order.slice();
      ordered.splice(index, 1);
      updateOrder(ordered);
    },
  };

  function updateOrder(order: typeof DEFAULT_ORDER) {
    if (order !== state.order) {
      reuseNodes(
        o,
        state.order,
        order,
        (item: string) => Item(item, scope),
        (node, item) => node.update(item),
      );
      save(order, state.theme);
      state.order = order.slice();
    }
  }

  function updateTheme(theme: string) {
    if (theme !== state.theme) {
      t.value = theme;
      save(state.order, theme);
      state.theme = theme;
    }
  }

  t.onchange = (event) => {
    updateTheme(event.target!.value);
  };

  reset.onclick = () => {
    updateOrder(DEFAULT_ORDER);
  };

  // Get user settings data
  chrome.storage.local.get(null, (settings: UserStorageData) => {
    const order = settings.o || DEFAULT_ORDER;
    const theme = settings.t || '';

    updateOrder(order);
    updateTheme(theme);
  });

  return root;
}

document.body.appendChild(Settings());
