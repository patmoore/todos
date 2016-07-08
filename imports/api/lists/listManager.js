import { Lists } from 'lists.js';
import { ManagerType } from 'meteor/patmoore:meteor-collection-management';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
const LIST_ID_ONLY = new SimpleSchema({
listId: { type: String },
}).validator();
debugger;
export var ListManager = ManagerType.create({
    'callPrefix': 'lists',
    'meteorTopicDefinitions': {
        'public': {
            cursor:function() {
                return Lists.find({
                        userId: { $exists: false },
                    }, {
                        fields: Lists.publicFields,
                    });
            }
        },
        'private': {
            cursor:function() {
                if (!this.userId) {
                  return this.ready();
                }
            
                return Lists.find({
                  userId: this.userId,
                }, {
                  fields: Lists.publicFields,
                });
            }
        }
    },
    'meteorCallDefinitions': {
        'insert': {
            validate: new SimpleSchema({}).validator(),
            run() {
                return Lists.insert({});
            },
        },

        'makePrivate': {
            validate: LIST_ID_ONLY,
            run({ listId }) {
              if (!this.userId) {
                throw new Meteor.Error('lists.makePrivate.notLoggedIn',
                  'Must be logged in to make private lists.');
              }
    
              const list = Lists.findOne(listId);
    
              if (list.isLastPublicList()) {
                throw new Meteor.Error('lists.makePrivate.lastPublicList',
                  'Cannot make the last public list private.');
              }
    
              Lists.update(listId, {
                $set: { userId: this.userId },
              });
            }
        },
        'makePublic': {
            validate: LIST_ID_ONLY,
            run({ listId }) {
              if (!this.userId) {
                throw new Meteor.Error('lists.makePublic.notLoggedIn',
                  'Must be logged in.');
              }

              const list = Lists.findOne(listId);

              if (!list.editableBy(this.userId)) {
                throw new Meteor.Error('lists.makePublic.accessDenied',
                  'You don\'t have permission to edit this list.');
              }

              // XXX the security check above is not atomic, so in theory a race condition could
              // result in exposing private data
              Lists.update(listId, {
                $unset: { userId: true },
              });
            }
        },
        'updateName': {
            validate: new SimpleSchema({
              listId: { type: String },
              newName: { type: String },
            }).validator(),
            run({ listId, newName }) {
              const list = Lists.findOne(listId);
    
              if (!list.editableBy(this.userId)) {
                throw new Meteor.Error('lists.updateName.accessDenied',
                  'You don\'t have permission to edit this list.');
              }
    
              // XXX the security check above is not atomic, so in theory a race condition could
              // result in exposing private data
    
              Lists.update(listId, {
                $set: { name: newName },
              });
            },
        },
        'remove': {
            validate: LIST_ID_ONLY,
            run({ listId }) {
              const list = Lists.findOne(listId);
    
              if (!list.editableBy(this.userId)) {
                throw new Meteor.Error('lists.remove.accessDenied',
                  'You don\'t have permission to remove this list.');
              }
    
              // XXX the security check above is not atomic, so in theory a race condition could
              // result in exposing private data
    
              if (list.isLastPublicList()) {
                throw new Meteor.Error('lists.remove.lastPublicList',
                  'Cannot delete the last public list.');
              }
    
              Lists.remove(listId);
            },
      }
});