function Course(codice, nome, crediti, selectedBy, maxStudenti, codiciIncompatibili, codicePropedeutico, color) {
    this.codice = codice;
    this.nome = nome;
    this.crediti = crediti;
    this.selectedby = selectedBy;
    this.maxstudenti = maxStudenti;
    this.incomp = codiciIncompatibili;
    this.proped = codicePropedeutico;
}

export { Course };