(function () {
  const monthOrder = {
    janvier: 1,
    février: 2,
    fevrier: 2,
    mars: 3,
    avril: 4,
    mai: 5,
    juin: 6,
    juillet: 7,
    août: 8,
    aout: 8,
    septembre: 9,
    octobre: 10,
    novembre: 11,
    décembre: 12,
    decembre: 12
  };

  function dateValue(card, index) {
    const dateText = card.querySelector(".project-date")?.textContent.trim().toLowerCase() || "";
    if (dateText.includes("continu") || dateText.includes("en cours")) {
      return [Infinity, Infinity, index];
    }

    const yearMatch = dateText.match(/\b(20\d{2})\b/);
    const year = yearMatch ? Number(yearMatch[1]) : 0;
    const month = Object.entries(monthOrder).find(([name]) => dateText.includes(name));
    return [year, month ? month[1] : 0, index];
  }

  document.querySelectorAll(".projects-grid").forEach((grid) => {
    const cards = [...grid.querySelectorAll(":scope > .project-card")];
    cards
      .map((card, index) => ({ card, value: dateValue(card, index) }))
      .sort((a, b) => {
        for (let i = 0; i < 2; i += 1) {
          if (a.value[i] !== b.value[i]) return b.value[i] - a.value[i];
        }
        return a.value[2] - b.value[2];
      })
      .forEach(({ card }) => grid.appendChild(card));
  });
})();
