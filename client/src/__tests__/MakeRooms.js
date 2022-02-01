import React from 'react';
import ReactDOM from 'react-dom';
import { MakeRooms } from 'Containers/Create/MakeRooms/MakeRooms';

describe('MakeRoom unit tests', () => {
  it('renders without crashing', () => {
    const div = document.createElement('div');
    ReactDOM.render(
      <MakeRooms
        participants={[]}
        activity={{}}
        userId=""
        course=""
        history={{}}
        match={{}}
        connectCreateRoom={() => {}}
        close={() => {}}
      />,
      div
    );
    ReactDOM.unmountComponentAtNode(div);
  });
});
