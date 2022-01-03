// ALSO CONSIDER MOVING GRANTACCESS() FROM COURSE CONTAINER TO HERE
// EXTRACT OUT THE LAYOUT PORTION INTO THE LAYYOUT FOLDER
import React, { PureComponent, Fragment } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { Member, Search, Modal, Button, InfoBox } from 'Components';
import Slider from 'Components/UI/Button/Slider';
import COLOR_MAP from 'utils/colorMap';
import API from 'utils/apiRequests';
import {
  grantAccess,
  updateCourseMembers,
  updateRoomMembers,
  inviteToCourse,
  inviteToRoom,
  clearNotification,
  removeCourseMember,
  removeRoomMember,
} from 'store/actions';
import { getAllUsersInStore } from 'store/reducers';
import Importer from '../../Components/Importer/ImporterCopy';
import SearchResults from './SearchResults';
import classes from './members.css';

class Members extends PureComponent {
  constructor(props) {
    super(props);
    const { searchedUsers } = this.props;
    this.state = {
      searchText: '',
      searchResults: searchedUsers,
      confirmingInvitation: false,
      userId: null,
      username: null,
      isCourseOnly: false,
    };
  }

  // componentDidUpdate(prevProps) {
  //   const { classList } = this.props;
  //   // fill in colors for members not yet pulled from store
  //   if (prevProps.classList.length !== classList.length) {
  //     console.log('Updating classlist: ', classList);
  //     classList.forEach((mem) => {
  //       if (!mem.color) {
  //         mem.color = COLOR_MAP[classList.length || 0];
  //       }
  //     });
  //   }
  // }

  componentWillUnmount() {
    const { notifications, connectClearNotification } = this.props;
    if (notifications.length > 0) {
      notifications.forEach((ntf) => {
        if (ntf.notificationType === 'newMember') {
          connectClearNotification(ntf._id);
        }
      });
    }
  }

  inviteMember = (id, username) => {
    let confirmingInvitation = false;
    const {
      resourceId,
      resourceType,
      courseMembers,
      connectInviteToCourse,
      connectInviteToRoom,
      classList,
    } = this.props;
    const color = COLOR_MAP[classList.length];
    if (resourceType === 'course') {
      // Don't invite someone if they are already in the course
      const alreadyInCourse =
        courseMembers && courseMembers.find((mem) => mem.user._id === id);
      if (!alreadyInCourse) connectInviteToCourse(resourceId, id, username);
    } else if (courseMembers) {
      const inCourse = courseMembers.filter(
        (member) => member.user._id === id
      )[0];
      if (!inCourse) {
        confirmingInvitation = true;
      } else {
        connectInviteToRoom(resourceId, id, username, color, {}); // @TODO **WHY** do we invite a user if they are already in the course?!?
      }
    } else {
      connectInviteToRoom(resourceId, id, username, color);
    }
    this.setState((prevState) => ({
      confirmingInvitation,
      // Remove the invited member from the search results
      searchResults: prevState.searchResults.filter((user) => user._id !== id),
      username: confirmingInvitation ? username : null,
      userId: confirmingInvitation ? id : null,
    }));
  };

  confirmInvitation = () => {
    const {
      parentResource,
      resourceId,
      connectInviteToCourse,
      connectInviteToRoom,
      classList,
    } = this.props;
    const color = COLOR_MAP[classList.length];
    const { userId, username } = this.state;
    connectInviteToCourse(parentResource, userId, username, {
      guest: true,
    });
    connectInviteToRoom(resourceId, userId, username, color, {});
    this.setState({
      confirmingInvitation: false,
      username: null,
      userId: null,
    });
  };

  removeMember = (info) => {
    const {
      resourceId,
      resourceType,
      connectRemoveCourseMember,
      connectRemoveRoomMember,
    } = this.props;
    if (resourceType === 'course') {
      connectRemoveCourseMember(resourceId, info.user._id);
    } else connectRemoveRoomMember(resourceId, info.user._id);
  };
  /**
   * @method changeRole
   * @param  {Object} info - member obj { color, _id, role, {_id, username}}
   */

  changeRole = (info) => {
    const {
      classList,
      resourceId,
      resourceType,
      connectUpdateRoomMembers,
      connectUpdateCourseMembers,
    } = this.props;
    const updatedMembers = classList.map((member) => {
      return member.user._id === info.user._id
        ? { role: info.role, user: info.user._id, color: info.color }
        : { role: member.role, user: member.user._id, color: member.color };
    });
    if (resourceType === 'course') {
      connectUpdateCourseMembers(resourceId, updatedMembers);
    } else connectUpdateRoomMembers(resourceId, updatedMembers);
  };

  // Consider finding a way to NOT duplicate this in MakeRooms and also now in Profile
  search = (text) => {
    const { classList, courseMembers } = this.props;
    const { isCourseOnly } = this.state;
    if (text.length > 0) {
      // prettier-ignore
      API.search(
        'user',
        text,
        classList.map((member) => member.user._id)
      )
        .then((res) => {
          const searchResults = res.data.results.filter((user) => {
            if (user.accountType === 'temp') return false;
            if (isCourseOnly) {
              return courseMembers.some((mem) => mem.user._id === user._id);
            }
            return true;
          });
          this.setState({ searchResults, searchText: text });
        })
        .catch((err) => {
          // eslint-disable-next-line no-console
          console.log('err: ', err);
        });
    } else {
      this.setState({ searchResults: [], searchText: text });
    }
  };

  /* Handler for the Import component */
  handleImport = (userObjects) => {
    Promise.all(
      userObjects.map(async (user) =>
        user._id
          ? API.put('user', user._id, user).then(() => {
              return user;
            })
          : API.post('user', user).then((res) => {
              return res.data.result;
            })
      )
    ).then((newUsers) =>
      newUsers.forEach((user) => this.inviteMember(user._id, user.username))
    );
  };

  render() {
    const {
      classList,
      notifications,
      owner,
      user,
      resourceType,
      resourceId,
      courseMembers,
      connectGrantAccess,
      connectClearNotification,
    } = this.props;
    const {
      confirmingInvitation,
      username,
      searchResults,
      searchText,
      isCourseOnly,
    } = this.state;

    let joinRequests = <p>There are no new requests to join</p>;
    if (owner && notifications.length >= 1) {
      joinRequests = notifications
        .filter((ntf) => ntf.notificationType === 'requestAccess')
        .map((ntf) => {
          return (
            <Member
              grantAccess={() => {
                connectGrantAccess(
                  ntf.fromUser._id,
                  resourceType,
                  resourceId,
                  ntf._id,
                  ntf.toUser
                );
              }}
              resourceName={resourceType}
              rejectAccess={() => {
                connectClearNotification(ntf._id);
              }}
              info={ntf.fromUser}
              key={ntf._id}
            />
          );
        });
    }
    const filteredClassList = [];
    const guestList = [];
    classList.forEach((member) => {
      if (member.role === 'guest') {
        guestList.push(member);
      } else {
        filteredClassList.push(member);
      }
    });
    const classListComponents = filteredClassList.map((member) => {
      // at least sometimes member is just user object so there is no member.user property /// <-- well thats not good, how did that happen? this hsould be consistant
      const userId = member.user ? member.user._id : member._id;
      // checking for notification...newMember type indicates this user has added themself by entering the entryCode
      const notification = notifications.filter((ntf) => {
        if (ntf.fromUser && ntf.notificationType === 'newMember') {
          return ntf.fromUser._id === userId;
        }
        return false;
      });

      return owner ? (
        <Member
          changeRole={this.changeRole}
          removeMember={this.removeMember}
          info={member}
          key={member.user._id}
          resourceName={resourceType}
          notification={notification.length > 0}
          owner
        />
      ) : (
        <Member
          info={member}
          key={member.user._id}
          resourceName={resourceType}
        />
      );
    });

    const guestListComponents = guestList.map((member) => {
      return owner ? (
        <Member
          changeRole={this.changeRole}
          removeMember={this.removeMember}
          info={member}
          key={member.user._id}
          resourceName={resourceType}
          owner
        />
      ) : (
        <Member info={member} key={member.user._id} />
      );
    });
    return (
      <div className={classes.Container}>
        <Modal
          show={confirmingInvitation}
          closeModal={() => this.setState({ confirmingInvitation: false })}
        >
          <div>
            {username} is not in this course...you can still add them to this
            room and they will be added to the course as a guest
          </div>
          <div>
            <Button m={5} click={this.confirmInvitation}>
              Add To Room
            </Button>
            <Button
              theme="Cancel"
              m={5}
              click={() => {
                this.setState({ confirmingInvitation: false });
              }}
            >
              Cancel
            </Button>
          </div>
        </Modal>
        <div>
          {owner ? (
            <InfoBox
              title="Add Participants"
              icon={<i className="fas fa-user-plus" />}
              rightIcons={
                resourceType === 'course' ? (
                  <Importer user={user} onImport={this.handleImport} />
                ) : null
              }
            >
              <Fragment>
                <Search
                  data-testid="member-search"
                  _search={this.search}
                  placeholder="search existing VMT users by username or email address"
                />
                {searchResults.length > 0 ? (
                  <SearchResults
                    searchText={searchText}
                    usersSearched={searchResults}
                    inviteMember={this.inviteMember}
                  />
                ) : null}
                {resourceType === 'room' && courseMembers ? (
                  <div className={classes.ToggleContainer}>
                    <Slider
                      data-testid="search-toggle"
                      action={() => {
                        this.setState(
                          (prevState) => ({
                            isCourseOnly: !prevState.isCourseOnly,
                          }),
                          () => {
                            this.search(searchText);
                          }
                        );
                      }}
                      isOn={isCourseOnly}
                      name="isCourseOnly"
                    />
                    <span className={classes.Email}>
                      {isCourseOnly
                        ? ' Toggle to Search all VMT users '
                        : ' Toggle to Search only for course members '}
                    </span>
                  </div>
                ) : null}
              </Fragment>
            </InfoBox>
          ) : null}
          {owner ? (
            <InfoBox
              title="New Requests to Join"
              icon={<i className="fas fa-bell" />}
            >
              <div data-testid="join-requests">{joinRequests}</div>
            </InfoBox>
          ) : null}
          <InfoBox title="Class List" icon={<i className="fas fa-users" />}>
            <div data-testid="members">{classListComponents}</div>
          </InfoBox>
          <InfoBox title="Guest List" icon={<i className="fas fa-id-badge" />}>
            <div data-testid="members">
              {guestListComponents.length > 0
                ? guestListComponents
                : `There are no guests in this ${resourceType}`}
            </div>
          </InfoBox>
        </div>
      </div>
    );
  }
}

Members.propTypes = {
  searchedUsers: PropTypes.arrayOf(PropTypes.shape({})),
  user: PropTypes.shape({}).isRequired,
  notifications: PropTypes.arrayOf(PropTypes.shape({})),
  resourceId: PropTypes.string.isRequired,
  resourceType: PropTypes.string.isRequired,
  courseMembers: PropTypes.arrayOf({}),
  owner: PropTypes.bool.isRequired,
  parentResource: PropTypes.string,
  classList: PropTypes.arrayOf(PropTypes.shape({})),
  connectGrantAccess: PropTypes.func.isRequired,
  connectUpdateCourseMembers: PropTypes.func.isRequired,
  connectUpdateRoomMembers: PropTypes.func.isRequired,
  connectInviteToCourse: PropTypes.func.isRequired,
  connectInviteToRoom: PropTypes.func.isRequired,
  connectClearNotification: PropTypes.func.isRequired,
  connectRemoveRoomMember: PropTypes.func.isRequired,
  connectRemoveCourseMember: PropTypes.func.isRequired,
};

Members.defaultProps = {
  searchedUsers: [],
  classList: [],
  courseMembers: null,
  notifications: null,
  parentResource: null,
};

const mapStateToProps = (state, ownProps) => {
  // STart the search results populated with people already in the store
  const usersToExclude = ownProps.classList.map((member) => member.user._id);
  const allUsers = getAllUsersInStore(state, usersToExclude);
  const userIds = [...allUsers.userIds].slice(0, 5);
  const usernames = [...allUsers.usernames].slice(0, 5);
  return {
    searchedUsers: userIds.map((id, i) => ({
      _id: id,
      username: usernames[i],
    })),
    user: state.user,
  };
};

// prettier-ignore
export default connect(mapStateToProps, {
  connectGrantAccess: grantAccess,
  connectUpdateCourseMembers: updateCourseMembers,
  connectUpdateRoomMembers: updateRoomMembers,
  connectInviteToCourse: inviteToCourse,
  connectInviteToRoom: inviteToRoom,
  connectClearNotification: clearNotification,
  connectRemoveRoomMember: removeRoomMember,
  connectRemoveCourseMember: removeCourseMember,
})(Members);
