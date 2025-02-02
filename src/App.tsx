import { ThemeProvider } from './contexts/ThemeContext';
import { ThemeToggle } from './components/ThemeToggle';
import { DialogueEditor } from './components/DialogueEditor';
import './styles/DialogueEditor.css';

function App() {
  return (
    <ThemeProvider>
      <div className='App'>
        <header>
          <h1>Dialogue Tree Editor</h1>
        </header>
        <main>
          <DialogueEditor />
          <ThemeToggle />
        </main>
      </div>
    </ThemeProvider>
  );
}

export default App;
