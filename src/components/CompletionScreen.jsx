import './CompletionScreen.css';

export function CompletionScreen({ originalImage, onNewGame }) {
  return (
    <div className="completion-screen">
      <div className="completion-content">
        <div className="celebration">🎉</div>
        <h2>Congratulations!</h2>
        <p>You've completed the coloring!</p>
        
        {originalImage && (
          <div className="completed-image">
            <img src={originalImage} alt="Completed artwork" />
          </div>
        )}
        
        <button className="new-game-btn" onClick={onNewGame}>
          Start New Coloring
        </button>
      </div>
    </div>
  );
}

export default CompletionScreen;
