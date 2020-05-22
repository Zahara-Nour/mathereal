import firebase from 'firebase/app'
import 'firebase/firestore'
import { saveAs } from 'file-saver'
import { lexicoSort } from 'app/utils'

const firebaseConfig = {
  apiKey: 'AIzaSyAMnIlAk2yqGItw5EfTCLqj2SdJF6Q5620',
  authDomain: 'mathereal-1586176000451.firebaseapp.com',
  databaseURL: 'https://mathereal-1586176000451.firebaseio.com',
  projectId: 'mathereal-1586176000451',
  storageBucket: 'mathereal-1586176000451.appspot.com',
  messagingSenderId: '702572178697',
  appId: '1:702572178697:web:cb14e184230ff9ca8277d8',
}

firebase.initializeApp(firebaseConfig)

const db = firebase.firestore()

const fetchCollection = ({ path, filters }) => {
  path = [...path]
  let documents = []
  let request = db.collection(path.shift())
  while (path.length > 0) {
    request = request.doc(path.shift()).collection(path.shift())
  }

  filters.forEach((filter) => {
    const name = Object.getOwnPropertyNames(filter)[0]
    const value = filter[name]
    request = request.where(name, '==', value)
  })

  request = request
    .get()
    .then((docs) => {
      docs.forEach((doc) => {
        documents.push({ ...doc.data(), id: doc.id })
      })
      documents.sort((a, b) => lexicoSort(a.name, b.name))
      return documents
    })
    .catch((error) =>
      console.error(`Error while fetching ${path.join('/')} : `, error.message),
    )

  return request
}

const listenCollection = ({ path, filters, onChange }) => {
  path = [...path]
  let request = db.collection(path.shift())
  while (path.length > 0) {
    request = request.doc(path.shift()).collection(path.shift())
  }

  filters.forEach((filter) => {
    const name = Object.getOwnPropertyNames(filter)[0]
    const value = filter[name]
    request = request.where(name, '==', value)
  })
  console.log('listenCollection')
 
    const unsubscribe = request.onSnapshot(
      (docs) => {
        const documents = []
        docs.forEach((doc) => {
          documents.push({ ...doc.data(), id: doc.id })
        })
        documents.sort((a, b) => lexicoSort(a.name, b.name))
        console.log('documents', documents)
        onChange(documents)
      },
      (error) =>
        console.error(
          `Error while listening ${path.join('/')} : `,
          error.message,
        ),
    )
  return unsubscribe
}


function fetchAssessments(user, type) {
  let collectionRef

  switch (type) {
    case 'Modèle global':
      collectionRef = db.collection('Templates')
      break
    case 'Modèle':
      collectionRef = db
        .collection('Users')
        .doc(user.email)
        .collection('Templates')
      break
    default:
      collectionRef = db
        .collection('Users')
        .doc(user.email)
        .collection('Assessments')
  }

  return collectionRef.get().then((docs) => {
    const result = []
    docs.forEach((doc) => {
      result.push(doc.data())
    })

    return result
  })
}

function fetchStudents(user) {
  const students = {}
  user.classes.forEach((c) => {
    students[c] = []
  })

  return db
    .collection('Users')
    .where('school', '==', user.school)
    .where('role', '==', 'student')
    .where('class', 'in', user.classes)
    .get()
    .then((docs) => {
      docs.forEach((doc) => {
        const student = doc.data()
        students[student.class].push(student)
      })
      return students
    })
}

function fetchCards(subject, domain, theme, level) {
  const cards = []
  const filters = []

  if (subject) filters.push(['subject', subject])
  if (domain) filters.push(['domain', domain])
  if (theme) filters.push(['theme', theme])
  if (level) filters.push(['level', level])

  let request = db.collection('FlashCards')
  for (let i = 0; i < filters.length; i++) {
    if (filters[i][1]) {
      request = request.where(filters[i][0], '==', filters[i][1])
    } else {
      break
    }
  }

  request = request
    .get()
    .then((docs) => {
      docs.forEach((doc) => {
        cards.push({ ...doc.data(), id: doc.id })
      })
      cards.sort((a, b) => {
        if (a.title < b.title) return -1
        if (a.title > b.title) return 1
        return 0
      })
      return cards
    })
    .catch((error) =>
      console.error('Error while fetching cards : ', error.message),
    )

  return request
}

function listenCards(subject, domain, theme, level, onChange) {
  let cards = []
  const filters = [
    ['subject', subject],
    ['domain', domain],
    ['theme', theme],
    ['level', level],
  ]
  let request = db.collection('FlashCards')
  for (let i = 0; i < filters.length; i++) {
    if (filters[i][1]) {
      request = request.where(filters[i][0], '==', filters[i][1])
    } else {
      break
    }
  }

  request = request.onSnapshot(
    (docs) => {
      cards = []
      docs.forEach((doc) => {
        cards.push({ ...doc.data(), id: doc.id })
      })
      cards.sort((a, b) => {
        if (a.title < b.title) return -1
        if (a.title > b.title) return 1
        return 0
      })
      onChange(cards)
    },
    (error) => console.error('Error while listening cards : ', error.message),
  )

  return request
}

function fetchCardsLevels(subject, domain) {
  const levelCards = []

  return db
    .collection('FlashCards')
    .where('subject', '==', subject)
    .where('domain', '==', domain)
    .get()
    .then((docs) => {
      docs.forEach((doc) => {
        const data = doc.data()
        const { level, theme, grade } = data
        const levelCard = levelCards.find(
          (card) =>
            card.theme === theme &&
            card.subject === subject &&
            card.domain === domain,
        )
        if (levelCard) {
          levelCard.levels[grade] = levelCard.levels[grade].includes(level)
            ? levelCard.levels[grade]
            : levelCard.levels[grade].concat(level).sort((a, b) => a - b)
        } else {
          levelCards.push({
            subject,
            domain,
            theme,
            levels: { [grade]: [level] },
          })
        }
      })
      return levelCards
    })
    .catch((error) =>
      console.error('Error while fetching cardsLevels : ', error.message),
    )
}

function fetchGrades() {
  return db
    .collection('Globals')
    .doc('structure')
    .get()
    .then((doc) => {
      if (doc.exists) {
        return doc.data().grades
      } else {
        console.error("document doesn't exist")
        return []
      }
    })
    .catch((error) =>
      console.error('Error while fetching grades : ', error.message),
    )
}

function fetchSubjects() {
  const subjects = []
  return db
    .collection('Globals')
    .doc('curriculum')
    .collection('Subjects')
    .get()
    .then((docs) => {
      docs.forEach((doc) => subjects.push(doc.data().label))
      return subjects
    })
    .catch((error) =>
      console.error('Error while fetching subjects : ', error.message),
    )
}

function fetchDomains(subject) {
  const domains = []
  return db
    .collection('Globals')
    .doc('curriculum')
    .collection('Domains')
    .where('subject', '==', subject)
    .get()
    .then((docs) => {
      docs.forEach((doc) => domains.push(doc.data().label))
      return domains
    })
    .catch((error) =>
      console.error('Error while fetching domains : ', error.message),
    )
}

function fetchThemes(subject, domain) {
  const themes = []
  return db
    .collection('Globals')
    .doc('curriculum')
    .collection('Themes')
    .where('subject', '==', subject)
    .where('domain', '==', domain)
    .get()
    .then((docs) => {
      docs.forEach((doc) => themes.push({ ...doc.data(), id: doc.id }))
      return themes
    })
    .catch((error) =>
      console.error('Error while fetching themes : ', error.message),
    )
}

function saveCard(card) {
  if (card.id) {
    const { id, ...rest } = card
    return db
      .collection('FlashCards')
      .doc(id)
      .set(rest)
      .catch((error) =>
        console.error(`Error while saving card n° ${id}`, error.message),
      )
  } else
    return db
      .collection('FlashCards')
      .doc()
      .set(card)
      .catch((error) => console.error(`Error while saving card`, error.message))
}

function saveToCollection({ path, document }) {
  path = path.split('/')
  const collection = path[path.length - 1]
  let request = db.collection(path.shift())
  while (path.length > 0) {
    request = request.doc(path.shift()).collection(path.shift())
  }
  if (document.id) {
    const { id, ...rest } = document
    request = request
      .doc(id)
      .update(rest)
      .then(() => `Document ${id} successfully updated in ${collection}`)
  } else {
    request = request
      .doc()
      .set(document)
      .then(() => `Document  successfully added to ${collection}`)
  }

  return request.catch((error) =>
    console.log(`Error while saving document in ${collection}`, error.message),
  )
}

export {
  listenCards,
  saveCard,
  fetchAssessments,
  fetchStudents,
  fetchCards,
  fetchSubjects,
  fetchDomains,
  fetchThemes,
  fetchGrades,
  fetchCardsLevels,
  fetchCollection,
  listenCollection,
  saveToCollection,
}
export default db