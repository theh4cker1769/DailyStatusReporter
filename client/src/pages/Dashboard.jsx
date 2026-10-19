import { useState } from "react";

import { projects } from "../data/projects";

import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import EmailPreview from "../components/EmailPreview";

import { getRandomActivities } from "../utils/randomGenerator";
import { generateEmail } from "../utils/emailGenerator";
import { parseActivitiesFromBody } from "../utils/activityParser";
import { generateActivitiesWithAI } from "../utils/aiGenerator";

function Dashboard() {
    const [selectedProject, setSelectedProject] = useState("");
    const [selectedActivities, setSelectedActivities] = useState([]);
    const [emailBody, setEmailBody] = useState("");
    const [sending, setSending] = useState(false);
    const [notes, setNotes] = useState("");
    const [aiLoading, setAiLoading] = useState(false);
    const [aiStatus, setAiStatus] = useState("");

    const handleProjectChange = (project) => {
        setSelectedProject(project);
        setSelectedActivities([]);
        setEmailBody("");
        setAiStatus("");
    };

    const toggleActivity = (activity) => {
        if (selectedActivities.includes(activity)) {
            setSelectedActivities(
                selectedActivities.filter((item) => item !== activity)
            );
        } else {
            setSelectedActivities([...selectedActivities, activity]);
        }
    };

    const handleGenerateRandom = () => {
        if (!selectedProject) {
            alert("Please select a project.");
            return;
        }

        const randomActivities = getRandomActivities(
            projects[selectedProject]
        );

        setSelectedActivities(randomActivities);

        setEmailBody(generateEmail(selectedProject, randomActivities));
    };

    const handleGenerateReport = () => {
        if (!selectedProject) {
            alert("Please select a project.");
            return;
        }

        if (selectedActivities.length === 0) {
            alert("Please select at least one activity.");
            return;
        }

        setEmailBody(generateEmail(selectedProject, selectedActivities));
    };

    // One handler for both AI modes: with notes it polishes them, without
    // notes it invents a plausible day's work from the project's examples.
    const handleGenerateWithAI = async () => {
        if (!selectedProject) {
            alert("Please select a project.");
            return;
        }

        setAiLoading(true);
        setAiStatus("");

        try {
            const trimmedNotes = notes.trim();

            const { activities, source, error } = await generateActivitiesWithAI({
                project: selectedProject,
                projectActivities: projects[selectedProject],
                notes: trimmedNotes,
                count: 3,
            });

            setSelectedActivities(activities);
            setEmailBody(generateEmail(selectedProject, activities));

            if (source === "fallback") {
                setAiStatus(`⚠️ AI unavailable (${error}) — used preset activities instead.`);
            } else {
                setAiStatus(
                    trimmedNotes ? "✨ Polished your notes." : "✨ Generated with AI."
                );
            }
        } finally {
            setAiLoading(false);
        }
    };

    const handleRegenerate = () => {
        handleGenerateRandom();
    };

    const handleSendEmail = async () => {
        if (!emailBody.trim()) {
            alert("Please generate a report first.");
            return;
        }

        try {
            setSending(true);

            const today = new Date();

            const subject = `STATUS REPORT ${today
                .toLocaleDateString("en-GB")
                .replace(/\//g, "/")} ${today.toLocaleDateString("en-US", {
                    weekday: "long",
                })}`;

            const parsedActivities = parseActivitiesFromBody(emailBody);
            const activitiesToSend = parsedActivities.length ? parsedActivities : selectedActivities;

            const response = await fetch("http://localhost:5000/send-email", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    subject,
                    body: emailBody,
                    project: selectedProject,
                    activities: activitiesToSend,
                })
            });

            const data = await response.json();
            if (data.success) {
                alert("✅ Email sent successfully!");
            } else {
                alert(data.message);
            }
        } catch (err) {
            console.error(err);
            alert("Failed to send email.");
        }
        finally {
            setSending(false);
        }
    };

    return (
        <div className="dashboard">

            <Header />

            <div className="dashboard-body">

                <div className="left-panel">

                    <Sidebar
                        projects={projects}
                        selectedProject={selectedProject}
                        onProjectChange={handleProjectChange}
                        selectedActivities={selectedActivities}
                        toggleActivity={toggleActivity}
                        onRandom={handleGenerateRandom}
                        onGenerate={handleGenerateReport}
                        onSendEmail={handleSendEmail}
                        sending={sending}
                        notes={notes}
                        onNotesChange={setNotes}
                        onGenerateWithAI={handleGenerateWithAI}
                        aiLoading={aiLoading}
                        aiStatus={aiStatus}
                    />

                </div>

                <div className="right-panel">

                    <EmailPreview
                        body={emailBody}
                        onBodyChange={setEmailBody}
                        onRegenerate={handleRegenerate}
                    />

                </div>

            </div>

        </div>
    );
}

export default Dashboard;