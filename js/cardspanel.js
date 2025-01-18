const togglePanelBtn = document.getElementById("toggle-panel");
const closePanelBtn = document.getElementById("close-panel");
const cardPanel = document.querySelector(".card-panel");
const cardsGrid = document.querySelector(".cards-grid");
let cards = [];

// Generate all 52 playing cards
function generateCards() {
  const suits = [
    { symbol: "♠", color: "black" },
    { symbol: "♥", color: "red" },
    { symbol: "♦", color: "red" },
    { symbol: "♣", color: "black" },
  ];

  const values = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

  suits.forEach((suit) => {
    values.forEach((value) => {
      const card = document.createElement("div");
      card.className = "card";
      card.dataset.value = `${value}${suit.symbol}`;
      card.dataset.color = suit.color;
      card.textContent = `${value}${suit.symbol}`;
      cardsGrid.appendChild(card);
    });
  });

  // Update cards NodeList after generation
  cards = document.querySelectorAll(".card");
}

// Initialize cards and setup event listeners when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  generateCards();
  setupCardSelection();
  setupValidationButton();
});

// Toggle panel visibility
togglePanelBtn.addEventListener("click", () => {
  cardPanel.classList.toggle("open");
  togglePanelBtn.textContent = cardPanel.classList.contains("open") ? "🎴 Hide Cards" : "🎴 Show Cards";
});

// Close panel
closePanelBtn.addEventListener("click", () => {
  cardPanel.classList.remove("open");
  togglePanelBtn.textContent = "🎴 Show Cards";
});

// Configuration
const maxSelectableCards = -1; // Can be adjusted as needed

function setupCardSelection() {
  cards.forEach((card) => {
    card.addEventListener("click", () => {
      // Toggle selection on clicked card
      if (card.classList.contains("selected")) {
        card.classList.remove("selected");
      } else {
        // Check if max selection reached
        const selectedCards = document.querySelectorAll(".card.selected");
        if (maxSelectableCards == -1 || selectedCards.length < maxSelectableCards) {
          card.classList.add("selected");
        } else {
          console.log(`Maximum of ${maxSelectableCards} cards selected`);
        }
      }
    });
  });
}

function setupValidationButton() {
  const validateBtn = document.createElement("button");
  validateBtn.id = "validate-selection";
  validateBtn.className = "validate-btn";
  validateBtn.textContent = "Validate Selection";
  cardPanel.appendChild(validateBtn);

  validateBtn.addEventListener("click", () => {
    const selectedCards = Array.from(document.querySelectorAll(".card.selected")).map((card) => card.dataset.value);

    if (selectedCards.length > 0) {
      console.log("Selected cards:", selectedCards);
    } else {
      console.log("No cards selected");
    }
  });
}

// Proper momentum scrolling implementation
let isDragging = false;
let startY, scrollTop;
let velocity = 0;
let lastTime = 0;
let lastY = 0;
let animationFrame;
const friction = 0.92;
const minVelocity = 0.5;

const startScroll = (clientY) => {
  isDragging = true;
  startY = clientY;
  scrollTop = cardsGrid.scrollTop;
  lastY = clientY;
  lastTime = Date.now();
  cancelAnimationFrame(animationFrame);
};

const stopScroll = () => {
  isDragging = false;
  startMomentum();
};

const doScroll = (clientY) => {
  if (!isDragging) return;

  // Calculate time delta
  const now = Date.now();
  const deltaTime = now - lastTime;

  // Calculate velocity
  if (deltaTime > 0) {
    velocity = (clientY - lastY) / deltaTime;
    lastY = clientY;
    lastTime = now;
  }

  // Apply scroll
  const deltaY = clientY - startY;
  cardsGrid.scrollTop = scrollTop - deltaY;
};

const startMomentum = () => {
  if (Math.abs(velocity) > minVelocity) {
    velocity *= friction;
    cardsGrid.scrollTop -= velocity * 16; // Adjusted for smoothness

    // Continue momentum
    animationFrame = requestAnimationFrame(startMomentum);
  } else {
    velocity = 0;
  }
};

// Mouse events
cardsGrid.addEventListener("mousedown", (e) => {
  startScroll(e.clientY);
});

cardsGrid.addEventListener("mouseleave", stopScroll);
cardsGrid.addEventListener("mouseup", stopScroll);
cardsGrid.addEventListener("mousemove", (e) => {
  doScroll(e.clientY);
});

// Touch events
cardsGrid.addEventListener("touchstart", (e) => {
  startScroll(e.touches[0].clientY);
});

cardsGrid.addEventListener("touchend", stopScroll);
cardsGrid.addEventListener("touchmove", (e) => {
  doScroll(e.touches[0].clientY);
});

// Prevent text selection while dragging
cardsGrid.addEventListener("selectstart", (e) => {
  if (isDragging) e.preventDefault();
});
