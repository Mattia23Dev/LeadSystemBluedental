import React from 'react'
import './Message.scss'
import moment from 'moment';

export default function Message({ msgdata, sender, timestamp }) {
    const orarioItaliano = moment(timestamp).locale('it').format('DD/MM/YYYY HH:mm:ss');   

    if (sender == 'user')
        return (
            <div className="messages mymessage">
                <div className="text">
                    {msgdata}
                    <span>{orarioItaliano}</span>
                </div>
            </div>
        )
    else
        return (
            <div className="messages othermessage">
                <div className="text">
                    {msgdata}
                    <span>{orarioItaliano}</span>
                </div>
            </div>
        )
}
