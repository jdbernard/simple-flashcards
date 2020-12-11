(function() {
  const FC = {
    currentSet: [],
    cards: [],
    curCardEls: [], // array of card HTMLElements 
    nextCardIdx: 0,
    cardOrder: [],
    savedSets: [], // elements are objects: { name: 'abc', cards: 'xyz' }
    $: document.querySelector.bind(document),
    version: "%VERSION%"
  };

  const IMG_REGEX = /(http|https|file):\/\/(.*)\.(jpg|jpeg|gif|png|svg)/;
  const URL_REGEX = /((([A-Za-z]{3,9}:(?:\/\/)?)(?:[\-;:&=\+\$,\w]+@)?[A-Za-z0-9\.\-]+|(?:www\.|[\-;:&=\+\$,\w]+@)[A-Za-z0-9\.\-]+)((?:\/[\+~%\/\.\w\-_]*)?\??(?:[\-\+=&;%@\.\w_]*)#?(?:[\.\!\/\\\w]*))?)/;

  FC.shuffle = function(inArray) {
    /* http://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
     * modified to be a pure function, not mutating it's input */
    var currentIndex = inArray.length
      , temporaryValue
      , randomIndex
      ;

    var outArray = inArray.slice(0);

    // While there remain elements to shuffle...
    while (0 !== currentIndex) {

      // Pick a remaining element...
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex -= 1;

      // And swap it with the current element.
      temporaryValue = outArray[currentIndex];
      outArray[currentIndex] = outArray[randomIndex];
      outArray[randomIndex] = temporaryValue;
    }

    return outArray;
  };

  FC.zipItems = function(prompts, answers) {
    return prompts.map((prompt, idx) => ({ prompt, answer: answers[idx] || null }));
  }

  FC.isRunning = function() {
    return !FC.bodyEl.classList.contains('settings-visible');
  };

  FC.toggleAdvSettings = function(ev) {
    FC.settingsEl.classList.toggle('adv-settings-visible');
  };

  FC.makeSetFromSettings = function(ev) {
    if (ev && ev.preventDefault) ev.preventDefault();

    const newSet = {
      name: FC.$('input[name=saveSetName]').value || 'new set',
      prompts: FC.promptsInputEl.value,
      answers: FC.answersInputEl.value,
      cardsHaveAnswers: FC.$('input[name=hasAnswers]:checked')?.value === 'yes',
      promptPeriod: parseInt(FC.$('input[name=promptPeriod]').value) || 3,
      answerPeriod: parseInt(FC.$('input[name=answerPeriod]').value) || 3,
      textSize: FC.$('select[name=textSize]').value || 'small',
      sortOrder: FC.$('select[name=cardOrder]').value || 'in-order'
    };

    return newSet;
  };

  FC.populateSettingsFromSet = function(set) {
    FC.$('input[name=saveSetName]').value = set.name;
    FC.promptsInputEl.value = set.prompts;
    FC.answersInputEl.value = set.answers;
    FC.$('input[name=promptPeriod]').value = set.promptPeriod;
    FC.$('input[name=answerPeriod]').value = set.answerPeriod;
    FC.$('select[name=cardOrder]').value = set.sortOrder;
    FC.$('select[name=textSize]').value = set.textSize;
    FC.$('input[name=hasAnswers][value="' +
      (set.cardsHaveAnswers?'yes':'no') + '"]').checked = true;
    FC.setCardsHaveAnswers();
  };

  FC.startCards = function(ev) {
    /* Handler for the "Go!" button that starts the flashcard display. */

    ev.preventDefault();

    FC.currentSet = FC.makeSetFromSettings();
    FC.cards = FC.zipItems(
      FC.currentSet.prompts.split('\n'),
      FC.currentSet.answers?.split('\n')
    );

    FC.curCardEls = FC.cards.map(FC.makeCard);

    FC.curCardEls.forEach(cardEl => FC.cardsEl.prepend(cardEl));

    FC.nextCardIdx = 0;

    const orderedIndices = [...Array(FC.cards.length).keys()];
    switch (FC.currentSet.sortOrder) {
      default:
      case 'in-order':
        FC.cardOrder = orderedIndices;
        break;
      case 'reverse':
        FC.cardOrder = orderedIndices.reverse();
        break;
      case 'random':
        FC.cardOrder = FC.shuffle(orderedIndices);
    }

    FC.$('html').requestFullscreen();
    FC.showNextCard();
    const fullInterval = (FC.currentSet.promptPeriod * 1000) +
      (FC.currentSet.cardsHaveAnswers ? FC.currentSet.answerPeriod * 1000 : 0);
    FC.runningInterval = setInterval(FC.showNextCard, fullInterval);
    FC.bodyEl.classList.remove('settings-visible');
  };

  FC.makeCard = function(item, idx) {
    const newCardDiv = document.createElement("div");
    newCardDiv.classList.add('card', FC.currentSet.textSize);
    newCardDiv.dataset.index = idx;

    const promptDiv = document.createElement("div");
    promptDiv.classList.add('prompt');
    promptDiv.innerHTML = FC.transformContent(item.prompt);

    const answerDiv = document.createElement("div");
    answerDiv.classList.add('answer');
    answerDiv.innerHTML = FC.transformContent(item.answer);

    newCardDiv.appendChild(promptDiv);
    newCardDiv.appendChild(answerDiv);
    return newCardDiv;
  };

  FC.transformContent = function(content) {
    const matchesImg = content.toLowerCase().trim().match(IMG_REGEX);
    if (matchesImg) {
      return '<img src="' + content.trim() + '"/>';
    } else {
      return content;
    }
  };

  FC.stopCards = function(ev) {
    clearInterval(FC.runningInterval);
    document.exitFullscreen();
    FC.bodyEl.classList.add('settings-visible');
    document.querySelectorAll('.card').forEach(el => el.remove());
  };

  FC.showNextCard = function() {
    FC.$('.card.current')?.classList?.remove('current', 'show-answer');

    const curCardEl = FC.$('.card[data-index="' + FC.cardOrder[FC.nextCardIdx] + '"]');
    curCardEl.classList.add('current');

    FC.nextCardIdx = (FC.nextCardIdx + 1) % FC.cards.length;

    if (FC.currentSet.cardsHaveAnswers) {
      setTimeout(
        () => { curCardEl.classList.add('show-answer') },
        FC.currentSet.promptPeriod * 1000
      );
    }
  };

  FC.handleLoadSet = function(ev) {
    ev.preventDefault();

    const setName = FC.$('select[name=loadSetName]').value;
    if (setName === '_NULL_') {
      alert("Can't load: no set selected.");
      return;
    }

    const setToLoad = FC.savedSets.find(item => item.name === setName);
    FC.populateSettingsFromSet(setToLoad);
  };

  FC.handleDeleteSet = function(ev) {
    if (ev) ev.preventDefault();

    const setName = FC.$('select[name=loadSetName]').value;
    if (setName === '_NULL_') {
      alert("Can't delete: no set selected.");
      return;
    }

    FC.savedSets = FC.savedSets.filter(set => set.name !== setName);
    FC.storeSets(FC.savedSets);
    FC.updateSetList(FC.savedSets);
  }

  FC.handleSaveSet = function(ev) {
    if (ev) ev.preventDefault();

    const newSet = FC.makeSetFromSettings();
    FC.saveSet(newSet);
  }

  FC.saveSet = function(newSet) {
    // Look for an existing set with this name
    const existingIdx = FC.savedSets.findIndex(set => set.name === newSet.name);

    if (existingIdx < 0) FC.savedSets.push(newSet);
    else FC.savedSets[existingIdx] = newSet;

    FC.storeSets(FC.savedSets);
    FC.updateSetList(FC.savedSets);
  };

  FC.updateSetList = function(sets) {
    const setSelectEl = FC.$('select[name=loadSetName]');
    var newHtml = '<option value=_NULL_>choose a set to load</option>';

    newHtml += sets.map(set => '<option>' + set.name + '</option>');
    setSelectEl.innerHTML = newHtml;
  }

  FC.storeSets = function(cardSets) {
    window.localStorage.setItem('cardSets', JSON.stringify(cardSets));
  };

  FC.retrieveSets = function() {
    return JSON.parse(window.localStorage.getItem('cardSets') || "[]");
  };

  FC.exportCardSet = function(ev) {
    ev.preventDefault();

    const setToExport = FC.makeSetFromSettings();
    const blob = new Blob(
        [JSON.stringify(setToExport)],
        {type: 'text/json;charset=utf-8', endings: 'native' });

    const downloadLink = document.createElement('a');
    downloadLink.href = window.URL.createObjectURL(blob);
    downloadLink.download = setToExport.name + '.json';
    downloadLink.style.display = 'none';
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  FC.importCardSet = function(ev) {
    ev.preventDefault();
    const fileInput = FC.$('input[name=importFileName]');
    fileInput.click();
  };

  FC.handleImport = function(ev) {
    if (this.files.length === 0 || !this.files[0]) return;

    const fileToImport = this.files[0];
    console.log("Importing file: ", fileToImport);

    const reader = new FileReader();
    reader.onload = function(readEv) {
      const importedSet = JSON.parse(readEv.target.result);
      FC.saveSet(importedSet);
      FC.storeSets(FC.savedSets);
      FC.updateSetList(FC.savedSets);
      FC.populateSettingsFromSet(importedSet);
    };

    reader.readAsText(fileToImport);
  };

  FC.importCardSetFromURL = function(ev) {
    fetch(FC.$('input[name=importURL]').value)
    .then(resp => resp.json())
    .then(set => {
      if (!set.name) throw "Invalid set definition file (missing name)";
      FC.saveSet(set);
      FC.storeSets(FC.savedSets);
      FC.updateSetList(FC.savedSets);
      FC.populateSettingsFromSet(set);
    })
    .catch(err => {
      alert("Unable to load set from URL: " + err);
      console.error(err);
    });
  };

  FC.setCardsHaveAnswers = function(ev) {
    if (FC.$('input[name=hasAnswers]:checked')?.value === 'yes') {
      FC.bodyEl.classList.add('cards-have-answers');
    } else {
      FC.bodyEl.classList.remove('cards-have-answers');
    }
  };

  window.onload = function() {
    // Cached element references
    FC.settingsEl = FC.$('#settings');
    FC.promptsInputEl = FC.$('#prompts-input');
    FC.answersInputEl = FC.$('#answers-input');
    FC.bodyEl = FC.$('body');
    FC.cardsEl = FC.$('#cards');

    // Event handlers
    FC.$('.toggle-adv-settings').addEventListener('click', FC.toggleAdvSettings);
    FC.$('#start-button').addEventListener('click', FC.startCards);
    FC.$('#stop-button').addEventListener('click', FC.stopCards);
    FC.$('#export').addEventListener('click', FC.exportCardSet);
    FC.$('#import').addEventListener('click', FC.importCardSet);
    FC.$('#importURL').addEventListener('click', FC.importCardSetFromURL);
    FC.$('input[name=importFileName]')
      .addEventListener('change', FC.handleImport);
    document.querySelectorAll('input[name=hasAnswers]').forEach(inpEl => 
      inpEl.addEventListener('change', FC.setCardsHaveAnswers));

    FC.$('#save-set').addEventListener('click', FC.handleSaveSet);
    FC.$('#load-set').addEventListener('click', FC.handleLoadSet);
    FC.$('#delete-set').addEventListener('click', FC.handleDeleteSet);

    // Load saved flashcard lists
    FC.savedSets = FC.retrieveSets();
    FC.updateSetList(FC.savedSets);

  };

  window.FC = FC;
})();
