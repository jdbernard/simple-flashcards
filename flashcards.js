(function() {
  const FC = {
    currentSet: [],
    items: [],
    nextCardIdx: 0,
    cardOrder: [], // elements are objects: { name: 'abc', cards: 'xyz' }
    savedSets: [],
    $: document.querySelector.bind(document)
  };

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

  FC.isRunning = function() {
    return !FC.bodyEl.classList.contains('settings-visible');
  };

  FC.toggleAdvSettings = function(ev) {
    FC.settingsEl.classList.toggle('adv-settings-visible');
  };

  FC.makeSetFromSettings = function(ev) {
    if (ev && ev.preventDefault) ev.preventDefault();

    const newSet = {
      name: (FC.currentSet || {}).name || 
            FC.$('input[name=saveSetName]').value ||
            'new set',
      cards: FC.itemsEl.value,
      slidePeriod: parseInt(FC.$('input[name=slidePeriod]').value) || 3,
      textSize: FC.$('select[name=textSize]').value || 'small',
      sortOrder: FC.$('select[name=cardOrder]').value || 'in-order'
    };

    return newSet;
  };

  FC.populateSettingsFromSet = function(set) {
    FC.$('input[name=saveSetName]').value = set.name;
    FC.itemsEl.value = set.cards;
    FC.$('input[name=slidePeriod]').value = set.slidePeriod;
    FC.$('select[name=cardOrder]').value = set.sortOrder;
    FC.$('select[name=textSize]').value = set.textSize;
  };

  FC.startCards = function(ev) {
    /* Handler for the "Go!" button that starts the flashcard display. */

    ev.preventDefault();

    FC.currentSet = FC.makeSetFromSettings();
    FC.items = FC.currentSet.cards.split('\n');

    FC.cardContentEl.classList.remove(
      'small-text', 'medium-text', 'large-text');
    FC.cardContentEl.classList.add(FC.currentSet.textSize + '-text');

    FC.nextCardIdx = 0;

    const orderedIndices = [...Array(FC.items.length).keys()];
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

    FC.showNextCard();
    FC.runningInterval = setInterval(FC.showNextCard, FC.currentSet.slidePeriod * 1000);
    FC.bodyEl.classList.remove('settings-visible');
  };

  FC.stopCards = function(ev) {
    clearInterval(FC.runningInterval);
    FC.bodyEl.classList.add('settings-visible');
  };

  FC.showNextCard = function() {
    const curItem = FC.items[FC.cardOrder[FC.nextCardIdx]]; 
    FC.cardContentEl.innerHTML = curItem;
    FC.nextCardIdx = (FC.nextCardIdx + 1) % FC.items.length;
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

  window.onload = function() {
    // Cached element references
    FC.settingsEl = FC.$('#settings');
    FC.itemsEl = FC.$('#items-input');
    FC.bodyEl = FC.$('body');
    FC.cardsEl = FC.$('#cards');
    FC.cardContentEl = FC.$('#card-content');

    // Event handlers
    FC.$('.toggle-adv-settings').addEventListener('click', FC.toggleAdvSettings);
    FC.$('#start-button').addEventListener('click', FC.startCards);
    FC.$('#stop-button').addEventListener('click', FC.stopCards);
    FC.$('#export').addEventListener('click', FC.exportCardSet);
    FC.$('#import').addEventListener('click', FC.importCardSet);
    FC.$('input[name=importFileName]')
      .addEventListener('change', FC.handleImport);

    FC.$('#save-set').addEventListener('click', FC.handleSaveSet);
    FC.$('#load-set').addEventListener('click', FC.handleLoadSet);
    FC.$('#delete-set').addEventListener('click', FC.handleDeleteSet);

    // Load saved flashcard lists
    FC.savedSets = FC.retrieveSets();
    FC.updateSetList(FC.savedSets);

  };

  window.FC = FC;
})();
