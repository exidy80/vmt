import React, { Fragment } from 'react';
import { CSVReader } from 'react-papaparse';
import { validateExistingField } from 'utils/validators';
import { NavLink } from 'react-router-dom';
import { Button } from 'Components';
import classes from './importer.css';
import DataViewer from './DataViewer';

export default function Importer(props) {
  // props will be user, onImport
  const [showModal, setShowModal] = React.useState(false);
  const [importedData, setImportedData] = React.useState([]);
  const buttonRef = React.createRef();

  const handleOpenDialog = (e) => {
    // Note that the ref is set async, so it might be null at some point
    if (buttonRef.current) {
      buttonRef.current.open(e);
    }
  };

  const handleOnFileLoad = async (data) => {
    const extractedData = data
      .map((d) => d.data)
      .filter((d) => Object.values(d).some((val) => val !== '')); // ignore any blank lines
    setShowModal(true);
    setImportedData(extractedData);
  };

  const handleOnError = (err) => {
    console.log(err);
  };

  const handleOnCancel = () => setShowModal(false);

  // The sponsors parameter is an object: keys are each username being imported, values
  // are the _id of the sponsor (if any). Note that the data parameter contains
  // just the username of the sponsor, if any.
  const createAndInviteMembers = async ({ data, sponsors }) => {
    const { user: creator, onImport } = props;
    const userObjects = await Promise.all(
      data.map(async (user) => {
        const existingUser = await validateExistingField(
          'username',
          user.username
        );
        const { organization, identifier, ...rest } = user;
        return existingUser
          ? {
              ...existingUser,
              metadata: { organization, identifier },
              sponsor: sponsors[user.username] || creator._id,
            }
          : {
              accountType: 'pending',
              ...rest,
              metadata: { organization, identifier },
              sponsor: sponsors[user.username] || creator._id,
            };
      })
    );

    setShowModal(false);
    onImport(userObjects);
  };

  const transformHeader = (header) => {
    switch (header.toLowerCase()) {
      case 'isgmail':
        return 'isGmail';
      case 'firstname':
        return 'firstName';
      case 'lastname':
        return 'lastName';
      default:
        return header.toLowerCase();
    }
  };

  return (
    <Fragment>
      <DataViewer
        show={showModal}
        data={importedData}
        onClose={createAndInviteMembers}
        onCancel={handleOnCancel}
        columnConfig={[
          { property: 'username', header: 'Username*' },
          { property: 'email', header: 'Email' },
          {
            property: 'isGmail',
            header: 'Require Login via Google with Email',
            type: 'boolean',
          },
          { property: 'firstName', header: 'First Name*' },
          {
            property: 'lastName',
            header: 'Last Name* (full, inital, or other)',
          },
          { property: 'organization', header: 'Affiliation' },
          { property: 'identifier', header: 'Student or Org ID' },
          { property: 'sponsor', header: 'Teacher VMT Username' },
          {
            property: 'comment',
            header: 'Comments (* req)',
            style: { color: 'red' },
            readOnly: true,
          },
        ]}
      />
      <div className={classes.Instructions}>
        <i className="far fa-question-circle fa-2x" />
        <div className={classes.TooltipContent}>
          <p>
            The search bar allows for the searching and addition of existing VMT
            Users. By using the Import feature, new users can be created for
            your course. <br /> For csv formatting and importing guides, please
            see the VMT{' '}
            <NavLink
              exact
              to="/instructions"
              className={classes.Link}
              activeStyle={{ borderBottom: '1px solid #2d91f2' }}
            >
              Instructions
            </NavLink>
          </p>
        </div>
      </div>
      <CSVReader
        ref={buttonRef}
        onFileLoad={handleOnFileLoad}
        onError={handleOnError}
        config={{ header: true, skipEmptyLines: true, transformHeader }}
        noProgressBar
        noDrag
      >
        {/* Undocumented feature of CSVReader is that providing a function allows for a custom UI */}
        {() => <Button click={handleOpenDialog}>Import New Users</Button>}
      </CSVReader>
    </Fragment>
  );
}
