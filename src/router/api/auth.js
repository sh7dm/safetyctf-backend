import Router from 'koa-router'
import jwt from 'jsonwebtoken'
import jwtConfig from '../../../config/jwt'
import User from '../../../models/User'
import Task from '../../../models/Task'
import 'babel-polyfill'

const router = Router()

router.post('/register', async ctx => {
  if (!ctx.request.body.name || !ctx.request.body.surname || !ctx.request.body.dob || !ctx.request.body.username || !ctx.request.body.password) {
    ctx.body = { code: 400 }
    return
  }

  const date = new Date().toISOString()

  let newUser

  if (ctx.request.body.invitedBy) {
    newUser = new User({
      name: ctx.request.body.name,
      surname: ctx.request.body.surname,
      dob: ctx.request.body.dob,
      username: ctx.request.body.username,
      password: ctx.request.body.password,
      registerDate: date,
      friends: [ ctx.request.body.invitedBy ],
      money: 15,
      experience: 15
    })

    let inviter = await User.findOne({ username: ctx.request.body.invitedBy })

    inviter.friends.push(newUser.username)
    inviter.money += 15
    inviter.experience += 15

    inviter.save()
  } else {
    newUser = new User({
      name: ctx.request.body.name,
      surname: ctx.request.body.surname,
      dob: ctx.request.body.dob,
      username: ctx.request.body.username,
      password: ctx.request.body.password,
      registerDate: date
    })
  }

  try {
    ctx.body = { user: await newUser.save(), code: 200 }
  } catch (err) {
    debug('/auth/register')('Error:', err)
    ctx.body = { code: 500, err: err }
    return
  }
})

router.post('/login', async ctx => {
  if (!ctx.request.body.username || !ctx.request.body.password) {
    ctx.body = { code: 400 }
    return
  }

  try {
    const user = await User.findOne({ username: ctx.request.body.username })

    if (!user) {
      ctx.body = { code: 404 }
      return
    }

    if (await user.comparePassword(ctx.request.body.password)) {
      ctx.body = { token: jwt.sign({
        username: user.username,
        name: user.name,
        surname: user.surname,
        dob: user.dob,
        role: user.role,
        tasksSolved: user.tasksSolved,
        money: user.money,
        experience: user.experience,
        registerDate: user.registerDate,
        friends: user.friends
      }, jwtConfig.secret, jwtConfig.options), code: 200 }
    } else {
      ctx.body = { code: 401 }
      return
    }
  } catch (err) {
    debug('/auth/login')('Error:', err)
    ctx.body = { code: 500, err: err }
    return
  }
})

router.post('/refreshToken', ctx => {
  if (!ctx.request.body.token) {
    ctx.body = { code: 400 }
    return
  }

  try {
    const decoded = jwt.verify(ctx.request.body.token, jwtConfig.secret)

    ctx.body = { token: jwt.sign({
      username: decoded.username,
      name: decoded.name,
      surname: decoded.surname,
      dob: decoded.dob,
      role: decoded.role,
      tasksSolved: decoded.tasksSolved,
      money: decoded.money,
      experience: decoded.experience,
      registerDate: decoded.registerDate,
      friends: decoded.friends
    }, jwtConfig.secret, jwtConfig.options), code: 200 }
  } catch (err) {
    ctx.body = { code: 401, err: err }
    return
  }
})

router.post('/changePassword', async ctx => {
  if (!ctx.request.body.token || !ctx.request.body.oldPassword || !ctx.request.body.newPassword) {
    ctx.body = { code: 400 }
    return
  }

  try {
    const decoded = jwt.verify(ctx.request.body.token, jwtConfig.secret)

    let user = await User.findOne({ username: decoded.username })
    if (!user) {
      ctx.body = { code: 404 }
      return
    }

    if (!await user.comparePassword(ctx.request.body.oldPassword)) {
      ctx.body = { code: 401 }
      return
    }

    user.password = ctx.request.body.newPassword
    await user.save()

    ctx.body = { user: user, code: 200 }
  } catch (err) {
    if (err && err.name === 'TokenExpiredError') {
      ctx.body = { code: 401, err: err }
      return
    }

    debug('/auth/changePassword')('Error:', err)
    ctx.body = { code: 500, err: err }
    return
  }
})

export default router
