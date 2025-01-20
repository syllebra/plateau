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
  setupDragAndDrop();
});

// Drag and Drop functionality
let isDragging = false;
let dragCard = null;
let ghostCard = null;
let dragStartIndex = -1;

function setupDragAndDrop() {
  const longPressDuration = 500; // milliseconds
  const dragThreshold = 5; // pixels
  let longPressTimer;
  let startX, startY;

  cards.forEach((card, index) => {
    // Add touch/pointer event listeners
    card.addEventListener('pointerdown', (e) => {
      startX = e.clientX;
      startY = e.clientY;
      longPressTimer = setTimeout(() => {
        startDrag(card, index);
      }, longPressDuration);
    });

    card.addEventListener('pointerup', (e) => {
      clearTimeout(longPressTimer);
      if (isDragging) {
        stopDrag();
      }
    });

    card.addEventListener('pointermove', (e) => {
      if (!isDragging && longPressTimer) {
        // Check if movement exceeds threshold
        const dx = Math.abs(e.clientX - startX);
        const dy = Math.abs(e.clientY - startY);
        if (dx > dragThreshold || dy > dragThreshold) {
          clearTimeout(longPressTimer);
        }
      }
      
      if (isDragging) {
        e.preventDefault();
        onDragMove(e);
      }
    });

    card.addEventListener('pointerleave', () => {
      clearTimeout(longPressTimer);
    });
  });
}

function startDrag(card, index) {
  isDragging = true;
  dragCard = card;
  dragStartIndex = index;
  
  // Create ghost card with enhanced styling
  ghostCard = card.cloneNode(true);
  ghostCard.classList.add('ghost');
  ghostCard.style.opacity = '0.7';
  ghostCard.style.pointerEvents = 'none';
  ghostCard.style.transform = 'scale(1.05)';
  ghostCard.style.boxShadow = '0 4px 20px rgba(0,0,0,0.2)';
  ghostCard.style.transition = 'transform 0.2s ease, opacity 0.2s ease';
  card.parentNode.insertBefore(ghostCard, card);
  
  // Remove dragged card from grid and add to body for smooth dragging
  const rect = card.getBoundingClientRect();
  card.style.position = 'fixed';
  card.style.width = `${rect.width}px`;
  card.style.height = `${rect.height}px`;
  card.style.left = `${rect.left}px`;
  card.style.top = `${rect.top}px`;
  card.style.margin = '0';
  document.body.appendChild(card);
  
  // Style dragged card with enhanced feedback
  card.classList.add('dragging');
  card.style.zIndex = 1000;
  card.style.transition = 'none';
  card.style.transform = 'scale(1.1) rotate(2deg)';
  card.style.boxShadow = '0 8px 30px rgba(0,0,0,0.3)';
  
  // Add document-wide listeners
  document.addEventListener('pointermove', onDragMove);
  document.addEventListener('pointerup', stopDrag);
  
  // Temporarily disable scrolling
  cardsGrid.style.overflowY = 'hidden';
}

function onDragMove(e) {
  if (!isDragging) return;
  
  // Move dragged card
  const rect = dragCard.getBoundingClientRect();
  dragCard.style.position = 'fixed';
  dragCard.style.left = `${e.clientX - rect.width/2}px`;
  dragCard.style.top = `${e.clientY - rect.height/2}px`;
  
  // Find hovered card
  const elements = document.elementsFromPoint(e.clientX, e.clientY);
  const targetCard = elements.find(el => el.classList.contains('card') && el !== dragCard);
  
  if (targetCard) {
    const targetIndex = Array.from(cards).indexOf(targetCard);
    if (targetIndex !== -1 && targetIndex !== dragStartIndex) {
      // Calculate direction
      const direction = targetIndex > dragStartIndex ? 1 : -1;
      
      // Move ghost card to new position
      if (direction === 1) {
        cardsGrid.insertBefore(ghostCard, targetCard.nextSibling);
      } else {
        cardsGrid.insertBefore(ghostCard, targetCard);
      }
      
      // Animate cards with cascading effect
      const distance = Math.abs(targetIndex - dragStartIndex);
      const maxOffset = 30;
      
      cards.forEach((card, i) => {
        if (card !== dragCard && card !== ghostCard) {
          const cardDistance = Math.abs(i - dragStartIndex);
          const offset = Math.min(maxOffset, maxOffset * (1 - (cardDistance / distance)));
          
          if (i >= Math.min(dragStartIndex, targetIndex) && 
              i <= Math.max(dragStartIndex, targetIndex)) {
            card.style.transition = 'transform 0.2s cubic-bezier(0.2, 0, 0, 1)';
            card.style.transform = `translateX(${direction * offset}px)`;
          } else {
            card.style.transition = 'transform 0.2s ease';
            card.style.transform = '';
          }
        }
      });
      
      dragStartIndex = targetIndex;
    }
  }
}

function stopDrag() {
  if (!isDragging) return;
  
  // Store references
  const currentGhost = ghostCard;
  const currentDrag = dragCard;
  
  if (currentGhost && currentGhost.parentNode) {
    // Get target position before removing ghost
    const targetPosition = currentGhost.getBoundingClientRect();
    
    // Calculate the correct insertion point
    const cardsArray = Array.from(cardsGrid.children);
    const ghostIndex = cardsArray.indexOf(currentGhost);
    
    // Fade out ghost card after animation
    currentGhost.style.transition = 'opacity 0.2s ease';
    currentGhost.style.opacity = '0';
    
    // Calculate final position relative to grid
    const gridRect = cardsGrid.getBoundingClientRect();
    const finalLeft = targetPosition.left - gridRect.left;
    const finalTop = targetPosition.top - gridRect.top;
    
    // Animate dragged card to final position
    currentDrag.style.transition = 'all 0.3s ease';
    currentDrag.style.left = `${finalLeft}px`;
    currentDrag.style.top = `${finalTop}px`;
    currentDrag.style.transform = 'scale(1) rotate(0deg)';
    currentDrag.style.opacity = '1';
    
    setTimeout(() => {
      // Reset positioning and reinsert into grid
      currentDrag.style.position = '';
      currentDrag.style.left = '';
      currentDrag.style.top = '';
      currentDrag.style.width = '';
      currentDrag.style.height = '';
      currentDrag.style.margin = '';
      
      // Remove from body and reinsert into grid
      currentDrag.remove();
      
      // Safely insert dragged card at correct position
      try {
        if (ghostIndex >= 0 && ghostIndex < cardsArray.length) {
          // Get the correct insertion point based on ghost position
          const insertionPoint = ghostIndex < cardsArray.length - 1 ? 
            cardsArray[ghostIndex + 1] : 
            null;
          
          if (insertionPoint && insertionPoint.parentNode === cardsGrid) {
            cardsGrid.insertBefore(currentDrag, insertionPoint);
          } else {
            cardsGrid.appendChild(currentDrag);
          }
        } else {
          cardsGrid.appendChild(currentDrag);
        }
      } catch (error) {
        console.error('Error inserting card:', error);
        cardsGrid.appendChild(currentDrag); // Fallback to append
      }
      
      // Finalize animation
      currentDrag.style.transition = '';
      currentDrag.style.transform = '';
      currentDrag.style.opacity = '1';
    }, 300);
  } else {
    // Fallback: Append to end if no ghost
    cardsGrid.appendChild(currentDrag);
  }
  
  // Remove ghost card after animation completes
  setTimeout(() => {
    if (currentGhost && currentGhost.parentNode) {
      currentGhost.remove();
    }
  }, 300);
  
  // Reset styles
  dragCard.classList.remove('dragging');
  dragCard.style.position = '';
  dragCard.style.left = '';
  dragCard.style.top = '';
  dragCard.style.zIndex = '';
  dragCard.style.transition = '';
  dragCard.style.boxShadow = '';
  
  // Reset other cards with animation
  cards.forEach(card => {
    if (card !== dragCard) {
      card.style.transition = 'transform 0.3s ease';
      card.style.transform = '';
    }
  });
  
  // Clean up
  document.removeEventListener('pointermove', onDragMove);
  document.removeEventListener('pointerup', stopDrag);
  isDragging = false;
  dragCard = null;
  ghostCard = null;
  dragStartIndex = -1;
  
  // Re-enable scrolling
  cardsGrid.style.overflowY = 'auto';
  
  // Update cards array
  cards = document.querySelectorAll('.card');
}

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
const maxSelectableCards = 1; // Can be adjusted as needed, -1 = infinite

function setupCardSelection() {
  cards.forEach((card) => {
    card.addEventListener("click", () => {
      // Toggle selection on clicked card
      if (card.classList.contains("selected")) {
        card.classList.remove("selected");
      } else {
        // Check if max selection reached
        const selectedCards = document.querySelectorAll(".card.selected");
        if (maxSelectableCards == -1 || selectedCards.length < maxSelectableCards || selectedCards.length == 1) {
          
          if(selectedCards.length == 1)
            cards.forEach((c) => {c.classList.remove("selected");});
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
let isScrolling = false;
let scrollStartY, scrollTop;
let scrollVelocity = 0;
let scrollLastTime = 0;
let scrollLastY = 0;
let scrollAnimationFrame;
const friction = 0.92;
const minVelocity = 0.5;

const startScroll = (clientY) => {
  isScrolling = true;
  scrollStartY = clientY;
  scrollTop = cardsGrid.scrollTop;
  scrollLastY = clientY;
  scrollLastTime = Date.now();
  cancelAnimationFrame(scrollAnimationFrame);
};

const stopScroll = () => {
  isScrolling = false;
  startMomentum();
};

const doScroll = (clientY) => {
  if (!isScrolling) return;

  // Calculate time delta
  const now = Date.now();
  const deltaTime = now - scrollLastTime;

  // Calculate velocity
  if (deltaTime > 0) {
    scrollVelocity = (clientY - scrollLastY) / deltaTime;
    scrollLastY = clientY;
    scrollLastTime = now;
  }

  // Apply scroll
  const deltaY = clientY - scrollStartY;
  cardsGrid.scrollTop = scrollTop - deltaY;
};

const startMomentum = () => {
  if (Math.abs(scrollVelocity) > minVelocity) {
    scrollVelocity *= friction;
    cardsGrid.scrollTop -= scrollVelocity * 16; // Adjusted for smoothness

    // Continue momentum
    scrollAnimationFrame = requestAnimationFrame(startMomentum);
  } else {
    scrollVelocity = 0;
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
