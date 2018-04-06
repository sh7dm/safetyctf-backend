import mongoose from 'mongoose'
import bcrypt from 'bcrypt'
import 'babel-polyfill'

const taskSchema = mongoose.Schema({
  name: { type: String },
  id: { type: String, unique: true },
  solvedBy: { type: Array, default: [] },
  money: { type: Number },
  experience: { type: Number },
  flag: { type: String },
  added: { type: String },
  by: { type: String },
  url: { type: String }
})
taskSchema.pre('save', async function () {
  this.flag = await bcrypt.hash(this.flag, 10)
})
taskSchema.method('comparePassword', async function (flag) {
  return await bcrypt.compare(flag, this.flag)
})
const Task = mongoose.model('Task', taskSchema)

export default Task