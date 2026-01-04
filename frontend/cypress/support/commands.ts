// custom Cypress commands
Cypress.Commands.add('setUsername', (username: string) => {
  cy.get('input').contains('Username:').parent().find('input').clear().type(username);
});
