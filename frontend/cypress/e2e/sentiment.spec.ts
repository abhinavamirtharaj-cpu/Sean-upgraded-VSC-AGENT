describe('Sentiment badges', () => {
  it('shows sentiment badge for outgoing message', () => {
    cy.visit('/');

    // set a deterministic username so test is stable
    cy.get('input').contains('Username:').parent().find('input').clear().type('alice-test');

    cy.wait(500); // allow socket to connect

    // type a message that triggers 'joy' in the mock sentiment (contains 'happy')
    cy.get('textarea').type('I am so happy today!{enter}');

    // find the last message bubble and ensure it shows the sentiment chip
    cy.get('.message-list').find('.mb-2').last().within(() => {
      cy.contains('joy').should('exist');
      cy.get('[role="img"]').should('exist');
    });
  });

  it('renders incoming message with attached sentiment', () => {
    cy.visit('/');
    cy.get('input').contains('Username:').parent().find('input').clear().type('bob-test');

    cy.wait(500);

    // simulate incoming message via socket (attach sentiment manually)
    cy.window().then((win) => {
      const sock = (win as any).socket;
      const msg = {
        id: 'test-incoming-1',
        sender: 'alice-test',
        ciphertext: 'Hello there',
        createdAt: Date.now(),
        sentiment: { emotion: 'joy', score: 0.9 }
      };
      sock.emit('encrypted-message', msg);
    });

    cy.get('.message-list').find('.mb-2').last().within(() => {
      cy.contains('joy').should('exist');
      cy.get('[role="img"]').should('exist');
    });
  });
});