function EmailPreview({
  body,
  onBodyChange,
  onRegenerate,
}) {
  return (
    <div className="email-container">
      <div className="email-header">
        <div>
          <h2>Email Preview</h2>
          <p>Preview before sending</p>
        </div>

        <button
          className="regenerate-btn"
          onClick={onRegenerate}
        >
          🔄 Regenerate
        </button>
      </div>

      <div className="email-body">
        {body ? (
          <textarea
            className="email-textarea"
            value={body}
            onChange={(e) => onBodyChange(e.target.value)}
            spellCheck={false}
          />
        ) : (
          <div className="empty-state">
            <h3>No Report Generated</h3>

            <p>
              Select a project and click
              <strong> Generate Random </strong>
              or
              <strong> Generate Report</strong>.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default EmailPreview;