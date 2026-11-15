import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  // запасний UI на випадок помилки (за замовчуванням - стандартне повідомлення)
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

// Error Boundary перехоплює помилки відтворення дочірніх компонентів,
// щоб замість "білого екрана" показати запасний інтерфейс.
// Error Boundary досі реалізується лише класовим компонентом.
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Помилка відтворення:', error, info.componentStack);
  }

  render() {
    return this.state.hasError
      ? (this.props.fallback ?? (
          <p
            role="alert"
            className="rounded border border-red-300 bg-red-50 p-4 text-red-700 dark:bg-red-950 dark:text-red-200"
          >
            Щось пішло не так. Оновіть сторінку.
          </p>
        ))
      : this.props.children;
  }
}
