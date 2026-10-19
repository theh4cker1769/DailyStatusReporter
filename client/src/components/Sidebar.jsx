import React from "react";

function Sidebar({
  projects,
  selectedProject,
  onProjectChange,
  selectedActivities,
  toggleActivity,
  onRandom,
  onGenerate,
  onSendEmail,
  sending,
  notes = "",
  onNotesChange,
  onGenerateWithAI,
  aiLoading,
  aiStatus,
}) {
  return (
    <div className="sidebar">

      <div className="sidebar-section">

        <label className="sidebar-label">
          Project
        </label>

        <select
          value={selectedProject}
          onChange={(e) => onProjectChange(e.target.value)}
        >
          <option value="">Select Project</option>

          {Object.keys(projects).map((project) => (
            <option key={project} value={project}>
              {project}
            </option>
          ))}
        </select>

      </div>
      {selectedProject && (

        <div className="sidebar-section ai-section">

          <label className="sidebar-label" htmlFor="ai-notes">
            What did you work on today?
          </label>

          <textarea
            id="ai-notes"
            className="ai-notes"
            rows={4}
            placeholder={"fixed login bug\nmyapproval listing api\nsome css fixes"}
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            disabled={aiLoading}
          />

          <button
            className="ai-btn"
            onClick={onGenerateWithAI}
            disabled={aiLoading}
          >
            {aiLoading
              ? "✨ Writing..."
              : notes.trim()
                ? "✨ Polish with AI"
                : "✨ Generate with AI"}
          </button>

          <p className="ai-hint">
            {notes.trim()
              ? "Your notes will be rewritten into formal sentences."
              : "Leave blank to let AI suggest a typical day's work."}
          </p>

          {aiStatus && <p className="ai-status">{aiStatus}</p>}

        </div>

      )}


      {selectedProject && (

        <>

          <div className="sidebar-section">

            <h3 className="activity-title">

              Activities

            </h3>

            <div className="activity-list">

              {projects[selectedProject].map((activity, index) => (

                <label
                  key={index}
                  className="activity-item"
                >

                  <input
                    type="checkbox"
                    checked={selectedActivities.includes(activity)}
                    onChange={() => toggleActivity(activity)}
                  />

                  <span>{activity}</span>

                </label>

              ))}

            </div>

          </div>

        </>

      )}

      
      <div className="button-group">

        <button
          className="primary-btn"
          onClick={onRandom}
        >
          🎲 Generate Random
        </button>

        <button
          className="secondary-btn"
          onClick={onGenerate}
        >
          📝 Generate Report
        </button>

        <button
          className="success-btn"
          onClick={onSendEmail}
          disabled={sending}
        >
          {sending ? '⏳ Sending...' : '📧 Send Email'}
        </button>

      </div>

    </div>
  );
}

export default Sidebar;