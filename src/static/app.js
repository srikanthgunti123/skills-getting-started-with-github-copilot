document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Function to fetch activities from API and render them
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message and any existing options
      activitiesList.innerHTML = "";
      activitySelect.innerHTML = "";

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        // Build participants list HTML
        let participantsHTML = "";
        if (details.participants.length > 0) {
          participantsHTML = `
            <div class="participants-section">
              <strong>Participants:</strong>
              <ul class="participants-list">
                ${details.participants.map(email => `
                  <li class="participant-item">
                    <span class="participant-email">${email}</span>
                    <button class="delete-participant" title="Remove participant" data-activity="${name}" data-email="${email}">🗑️</button>
                  </li>
                `).join("")}
              </ul>
            </div>
          `;
        } else {
          participantsHTML = `
            <div class="participants-section">
              <strong>Participants:</strong>
              <p class="no-participants">No participants yet.</p>
            </div>
          `;
        }

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          ${participantsHTML}
        `;

        activitiesList.appendChild(activityCard);

        // Add event listeners for delete buttons within this card
        activityCard.querySelectorAll('.delete-participant').forEach(btn => {
          btn.addEventListener('click', async (e) => {
            const activity = btn.getAttribute('data-activity');
            const email = btn.getAttribute('data-email');
            if (!confirm(`Remove ${email} from ${activity}?`)) return;

            try {
              const response = await fetch(`/activities/${encodeURIComponent(activity)}/unregister?email=${encodeURIComponent(email)}`, {
                method: 'DELETE',
              });
              const result = await response.json();
              if (response.ok) {
                // Find the list item element for this button
                const li = btn.closest('.participant-item');
                if (li) {
                  // Play removing animation
                  li.classList.add('removing');

                  // Wait for transitionend or fallback timeout
                  await new Promise(resolve => {
                    const timeout = setTimeout(resolve, 350);
                    li.addEventListener('transitionend', function onEnd(e) {
                      // ensure this is for opacity/transform
                      if (e.propertyName === 'opacity' || e.propertyName === 'transform') {
                        clearTimeout(timeout);
                        li.removeEventListener('transitionend', onEnd);
                        resolve();
                      }
                    });
                  });
                }

                // Refresh the activities list after removal
                messageDiv.textContent = result.message || 'Participant removed';
                messageDiv.className = 'message success';
                messageDiv.classList.remove('hidden');
                setTimeout(() => messageDiv.classList.add('hidden'), 5000);
                await fetchActivities();
              } else {
                messageDiv.textContent = result.detail || 'An error occurred';
                messageDiv.className = 'message error';
                messageDiv.classList.remove('hidden');
                setTimeout(() => messageDiv.classList.add('hidden'), 5000);
              }
            } catch (error) {
              messageDiv.textContent = 'Failed to remove participant. Please try again.';
              messageDiv.className = 'message error';
              messageDiv.classList.remove('hidden');
              setTimeout(() => messageDiv.classList.add('hidden'), 5000);
              console.error('Error removing participant:', error);
            }
          });
        });

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        await fetchActivities(); // Refresh list after signup
        // Animate the newly added participant
        setTimeout(() => {
          const email = document.getElementById("email").value;
          const activity = document.getElementById("activity").value;
          const activityCards = document.querySelectorAll('.activity-card');
          activityCards.forEach(card => {
            if (card.querySelector('h4')?.textContent === activity) {
              card.querySelectorAll('.participant-item').forEach(item => {
                if (item.querySelector('.participant-email')?.textContent === email) {
                  item.classList.add('adding');
                  setTimeout(() => item.classList.remove('adding'), 700);
                }
              });
            }
          });
        }, 100);
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
